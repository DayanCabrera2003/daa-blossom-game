import Phaser from 'phaser';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import { cardDemos } from '@levels/cards/catalog';
import type { CardDemo } from '@levels/cards/demo';
import type { CardId } from '@levels/cards/schema';
import { visibleLevels } from '@services/progress';
import { recordCompletion, recordNotebook, recordTutorialSeen, writeSave } from '@services/save';
import {
  handle,
  openController,
  type Controller,
  type Effect,
  type UiEvent,
} from '../systems/levelController';
import { playtestEntries } from '../systems/playtestEntries';
import type { StarResult } from '../systems/stars';
import { helpCards, offerCards, startCards, stepCard } from '../systems/tutorials';
import { fitCamera } from '../view/fitCamera';
import type { ShownCard } from '../view/TutorialView';
import { showVictoryPanel } from '../view/VictoryPanel';
import type { CounterexampleSceneData } from './CounterexampleScene';
import { contextOf, type GameContext } from './context';
import { LevelRenderer } from './level/LevelRenderer';
import { bindLevelInput } from './level/levelInput';
import { showEffect, type EffectStage } from './level/levelEffects';
import { buildLevelViews, buildPresenterViews, type LevelViews } from './level/levelViews';
import { Presenter } from './presenter';

/**
 * A level being played. The scene takes no decision and draws nothing itself: it builds the screen
 * (`level/levelViews.ts`), sends the player's presses, keys and buttons (`level/levelInput.ts`) to the
 * level controller, hands the effects it answers with to `level/levelEffects.ts`, and has
 * `level/LevelRenderer.ts` repaint every layer after each event. Dialogue, questions, replays and the
 * victory panel go through the presenter (`presenter.ts`), which shows them in the order the
 * presentation queue decides. What stays here is the wiring, and what outlives the screen: the save
 * and the playtest log.
 */
export class LevelScene extends Phaser.Scene {
  private context!: GameContext;
  private level!: Level;
  private controller!: Controller;
  private labels: readonly string[] = [];
  private views!: LevelViews;
  /** Paints every layer of the screen from the pure pictures of the garden and the HUD. */
  private painter!: LevelRenderer;
  /** Every mechanic card's demo, built once for the scene object Phaser reuses. */
  private cards: ReadonlyMap<CardId, CardDemo> | null = null;
  /** The cards the player has seen, or that wait their turn in this level: none is queued twice. */
  private offered: ReadonlySet<string> = new Set();
  /** Shows lines, questions, replays and the victory panel one at a time, in the queue's order. */
  private presenter!: Presenter;
  /** Where the controller's effects are shown (`level/levelEffects.ts`). */
  private stage!: EffectStage;
  /**
   * Whether create() built the level. Phaser reuses this scene object for every level, so the flag
   * is reset on each create(); it stays false when the level id is unknown and the scene is
   * already leaving for the hub, so update() never reaches views that were not built.
   */
  private ready = false;

  constructor() {
    super('level');
  }

  create(data: { levelId: string }): void {
    fitCamera(this);
    this.ready = false;
    this.context = contextOf(this);
    const level = this.context.catalog.find((candidate) => candidate.data.id === data.levelId);
    if (level === undefined) {
      this.scene.start('hub');
      return;
    }
    this.level = level;
    this.labels = level.data.sprouts.map((sprout) => sprout.label);
    this.cards ??= cardDemos();
    this.offered = new Set(this.context.save.tutorialsSeen);
    const opened = openController(level, this.time.now);
    this.controller = opened.controller;
    this.context.playtest.record([
      { kind: 'levelStart', at: this.context.clock(), level: level.data.id },
    ]);
    const { t } = this.context;
    this.views = buildLevelViews(this, t, {
      dispatch: (event) => this.dispatch(event),
      back: () => this.leave(),
      help: () => this.openHelp(),
    });
    // A new painter for every level: its timing starts afresh with the level.
    this.painter = new LevelRenderer(
      this.views,
      { labels: this.labels, kinds: level.data.sprouts.map((sprout) => sprout.kind) },
      { controller: () => this.controller, replaySun: () => this.presenter.replaySun },
    );
    this.presenter = new Presenter(
      this,
      buildPresenterViews(this, t, this.views.dialogue),
      {
        showDay: (state) =>
          state === null
            ? this.painter.render(this.time.now)
            : this.painter.renderReplayed(state, this.time.now),
        searched: () => this.forward({ kind: 'searched' }),
        stopAnimation: () => this.views.animation.finish(),
        victory: (stars) => this.offerNext(stars),
        answer: (question, value) =>
          this.dispatch(
            question.kind === 'bet' ? { kind: 'bet', value } : { kind: 'answer', option: value },
          ),
        counterexample: (option) => this.openCounterexample(option),
        card: (card) => this.shownCard(card),
        cardClosed: (card) => this.cardSeen(card),
      },
      { t, line: this.context.line },
    );
    this.stage = {
      level,
      labels: this.labels,
      t,
      line: this.context.line,
      controller: () => this.controller,
      now: () => this.time.now,
      toast: this.views.toast,
      animation: this.views.animation,
      presenter: this.presenter,
      win: (stars) => this.win(stars),
      writeNotebook: () => this.writeNotebook(),
    };
    bindLevelInput(this, {
      dispatch: (event) => this.dispatch(event),
      leave: () => this.leave(),
      dialogueOpen: () => this.views.dialogue.open,
      drawing: () => this.controller.pointer.chain !== null,
    });
    this.ready = true;
    // The cards of what opens with the level come first; then the script opens it: its first
    // lines, then whatever step waits for the player.
    this.offer(startCards(level, this.offered));
    for (const effect of opened.effects) this.show(effect);
    this.painter.render(this.time.now);
  }

  override update(time: number): void {
    if (!this.ready) return;
    this.views.animation.update(time);
    this.painter.update(time);
    this.presenter.update(time);
    this.painter.refreshHud(time);
  }

  /**
   * An event of the player. While the day replays, the player's input waits: nothing reaches the
   * controller.
   */
  private dispatch(event: UiEvent): void {
    if (!this.presenter.blocksInput) this.forward(event);
  }

  /**
   * One event through the controller; a new move ends any animation still playing. It also takes
   * the end of the light's own search, which the presenter reports while its day is on screen.
   */
  private forward(event: UiEvent): void {
    if (event.kind !== 'move') this.views.animation.finish();
    const step = handle(this.controller, event, this.time.now);
    this.context.playtest.record(
      playtestEntries(this.controller, event, step, this.context.clock()),
    );
    this.controller = step.controller;
    for (const effect of step.effects) this.show(effect);
    this.painter.render(this.time.now);
  }

  private show(effect: Effect): void {
    // A step that brings a new gesture shows its card first, before whatever it opens.
    const card = stepCard(effect.kind, this.offered);
    if (card !== null) this.offer([card]);
    showEffect(effect, this.stage);
  }

  /** Queues the mechanic cards among `candidates` that are neither seen nor already waiting. */
  private offer(candidates: readonly CardId[]): void {
    const { cards, offered } = offerCards(this.offered, candidates);
    this.offered = offered;
    for (const card of cards) this.presenter.present({ kind: 'tutorial', card });
  }

  /**
   * "?": the cards of what the level has open so far, again, one after another; seen or not, and
   * not queued a second time while they are still showing.
   */
  private openHelp(): void {
    if (this.presenter.cardsQueued) return;
    for (const card of helpCards(this.level, this.controller.session.flow.index))
      this.presenter.present({ kind: 'tutorial', card });
  }

  /** A mechanic card in the player's words, with its demo. */
  private shownCard(card: CardId): ShownCard {
    const demo = this.cards?.get(card);
    invariant(demo !== undefined, `the cards file has a demo for ${card}`);
    const { t } = this.context;
    return { title: t(`tutorial.${card}.title`), body: t(`tutorial.${card}.body`), demo };
  }

  /** A closed card is seen for good: saved at once, so it never shows by itself again. */
  private cardSeen(card: CardId): void {
    this.context.save = recordTutorialSeen(this.context.save, card);
    writeSave(this.context.storage, this.context.save);
  }

  /** Back to the hub; a level left unwon is logged as left. */
  private leave(): void {
    if (this.controller.session.won === null) {
      this.context.playtest.record([
        {
          kind: 'levelEnd',
          at: this.context.clock(),
          level: this.level.data.id,
          outcome: 'left',
          stars: null,
        },
      ]);
    }
    this.scene.start('hub');
  }

  /** Writes the level's statement in the player's notebook, saved at once, and says so. */
  private writeNotebook(): void {
    this.context.save = recordNotebook(this.context.save, this.level.data.id);
    writeSave(this.context.storage, this.context.save);
    this.views.toast.show(this.context.t('notebook.written'));
  }

  /**
   * Opens the garden that refutes the false notebook statement `option` in its own screen, while
   * this one sleeps as it is; coming back wakes it and the notebook asks again.
   */
  private openCounterexample(option: number): void {
    const data: CounterexampleSceneData = {
      levelId: this.level.data.id,
      option,
      back: () => {
        this.scene.wake();
        this.presenter.counterexampleOver();
      },
    };
    this.scene.launch('counterexample', data);
    this.scene.sleep();
  }

  /** Records the win at once; the victory panel waits its turn behind any lines or replay. */
  private win(stars: StarResult): void {
    const id = this.level.data.id;
    this.context.save = recordCompletion(this.context.save, id, stars.total);
    writeSave(this.context.storage, this.context.save);
    this.presenter.present({ kind: 'victory', stars });
  }

  /** Shows the victory panel, offering the next level (if any) or the hub. */
  private offerNext(stars: StarResult): void {
    const id = this.level.data.id;
    // The next level the player can see: outside teacher mode, drafts are skipped.
    const { catalog, teacherMode } = this.context;
    const shown = visibleLevels(
      catalog.map((level) => ({ id: level.data.id, draft: level.data.draft })),
      teacherMode,
    );
    const next = shown[shown.findIndex((level) => level.id === id) + 1];
    showVictoryPanel(this, this.context.t, stars, {
      next: next === undefined ? null : () => this.scene.start('level', { levelId: next.id }),
      hub: () => this.scene.start('hub'),
    });
  }
}
