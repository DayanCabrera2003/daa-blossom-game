import Phaser from 'phaser';
import type { Level } from '@levels/build';
import { codexSources, openCodex, pagesOpened } from '@services/codexProgress';
import { unlockedLevels, visibleLevels } from '@services/progress';
import { recordCompletion, recordNotebook } from '@services/save';
import type { AssetKey } from '../assets/keys';
import { levelKeys, loadRequests } from '../assets/loadPlan';
import {
  handle,
  openController,
  type Controller,
  type Effect,
  type UiEvent,
} from '../systems/levelController';
import { cardJingle, levelScreen, trackFor, victoryJingle } from '../systems/musicFor';
import { playtestEntries } from '../systems/playtestEntries';
import { raceCues } from '../systems/raceCues';
import { replayCues } from '../systems/replayCues';
import { effectCues } from '../systems/soundCues';
import type { StarResult } from '../systems/stars';
import { startCards, stepCard } from '../systems/tutorials';
import { SfxPlayer } from '../audio/SfxPlayer';
import { fitCamera } from '../view/fitCamera';
import { LAYOUT } from '../view/layout';
import { showVictoryPanel } from '../view/VictoryPanel';
import type { CounterexampleSceneData } from './CounterexampleScene';
import { contextOf, type GameContext } from './context';
import { LevelCards } from './level/LevelCards';
import { LevelRenderer } from './level/LevelRenderer';
import { bindLevelInput } from './level/levelInput';
import { showEffect, type EffectStage } from './level/levelEffects';
import { buildLevelViews, buildPresenterViews, type LevelViews } from './level/levelViews';
import { Presenter } from './presenter';
import { queueLoads } from './queueLoads';
import { addSettings } from './settingsPanel';

/**
 * A level being played. The scene takes no decision and draws nothing itself: it builds the screen
 * (`level/levelViews.ts`), sends the player's presses, keys and buttons (`level/levelInput.ts`) to the
 * level controller, hands the effects it answers with to `level/levelEffects.ts`, and has
 * `level/LevelRenderer.ts` repaint every layer after each event. Dialogue, questions, replays and the
 * victory panel go through the presenter (`presenter.ts`), which shows them in the order the
 * presentation queue decides, and the mechanic cards through `level/LevelCards.ts`. What stays here is the wiring, and what outlives the screen: the save
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
  /** Shows lines, questions, replays and the victory panel one at a time, in the queue's order. */
  private presenter!: Presenter;
  /** The mechanic cards of this level: queued, shown again on "?", saved once seen. */
  private cards!: LevelCards;
  /** Where the controller's effects are shown (`level/levelEffects.ts`). */
  private stage!: EffectStage;
  /** Plays the sounds of moves, refusals and replays on the effects channel. */
  private sfx!: SfxPlayer;
  /** The jingle of the win, rung when the victory panel shows. */
  private winJingle: AssetKey = 'jingle.victory';
  /** Whether the win opened pages of the Codex, told when the victory panel shows. */
  private codexNotice = false;
  /**
   * Whether create() built the level. Phaser reuses this scene object for every level, so the flag
   * is reset on each create(); it stays false when the level id is unknown and the scene is
   * already leaving for the hub, so update() never reaches views that were not built.
   */
  private ready = false;

  constructor() {
    super('level');
  }

  /**
   * Loads the music of the level's chapter (its race variant too, in chapter 6) unless an earlier
   * level of the chapter already did; the boot group is loaded by then.
   */
  preload(): void {
    const { levelId } = this.sys.settings.data as { levelId: string };
    const missing = levelKeys(levelId, (key) => this.cache.audio.exists(key));
    queueLoads(this.load, loadRequests(missing));
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
    // The chapter's track (its race variant in a level of races); a level of the same chapter as
    // the one before goes on with it.
    this.context.music.play(trackFor(levelScreen(level)));
    this.labels = level.data.sprouts.map((sprout) => sprout.label);
    const opened = openController(level, this.time.now);
    this.controller = opened.controller;
    this.context.playtest.record([
      { kind: 'levelStart', at: this.context.clock(), level: level.data.id },
    ]);
    const { t } = this.context;
    this.sfx = new SfxPlayer(this, this.context.audio);
    this.views = buildLevelViews(this, t, {
      dispatch: (event) => this.dispatch(event),
      back: () => this.leave(),
      help: () => this.cards.help(level, this.controller.session.flow.index),
      book: () => this.context.bus.emit('book.open', { book: 'codex' }),
    });
    // A new painter for every level: its timing starts afresh with the level.
    this.painter = new LevelRenderer(
      this.views,
      { labels: this.labels, kinds: level.data.sprouts.map((sprout) => sprout.kind) },
      {
        controller: () => this.controller,
        replaySun: () => this.presenter.replaySun,
        raceClock: () => this.presenter.raceClock,
      },
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
        raced: () => this.forward({ kind: 'raced' }),
        stopAnimation: () => {
          this.views.animation.finish();
          this.sfx.cancel();
        },
        replayed: (from, to) => this.sfx.schedule(replayCues(from, to)),
        raceStarted: (step) => this.sfx.schedule(raceCues(level.flow, step)),
        victory: (stars) => this.offerNext(stars),
        answer: (question, value) =>
          this.dispatch(
            question.kind === 'bet' ? { kind: 'bet', value } : { kind: 'answer', option: value },
          ),
        counterexample: (question, option) => this.openCounterexample(question, option),
        card: (card) => {
          // A tool shown for the first time rings the unlock.
          const jingle = cardJingle(card, new Set(this.context.saves.get().tutorialsSeen));
          if (jingle !== null) this.context.music.jingle(jingle);
          return this.cards.shown(card);
        },
        cardClosed: (card) => this.cards.closed(card),
      },
      { t, line: this.context.line },
    );
    this.cards = new LevelCards(this.context, this.presenter);
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
      jingle: (key) => this.context.music.jingle(key),
    };
    // The settings, at the bottom left, clear of the buttons laid out from the right.
    const settings = addSettings(this, { x: LAYOUT.margin, y: LAYOUT.bottomY - 1 });
    bindLevelInput(this, {
      dispatch: (event) => this.dispatch(event),
      leave: () => this.leave(),
      insideLayer: () => this.controller.layers.length > 0,
      settingsOpen: settings.open,
      closeSettings: settings.close,
      dialogueOpen: () => this.views.dialogue.open,
      drawing: () => this.controller.pointer.chain !== null,
    });
    this.ready = true;
    // The cards of what opens with the level come first; then the script opens it: its first
    // lines, then whatever step waits for the player.
    this.cards.offer(startCards(level, this.cards.seen));
    for (const effect of opened.effects) this.show(effect);
    this.painter.render(this.time.now);
    this.showBook();
  }

  /** The Códex button of the HUD shows once some page of the book is open. */
  private showBook(): void {
    const { catalog, saves, teacherMode } = this.context;
    this.views.hud.showBook(openCodex(codexSources(catalog), saves.get(), teacherMode).size > 0);
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
    if (event.kind !== 'move') {
      this.views.animation.finish();
      this.sfx.cancel();
    }
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
    const card = stepCard(effect.kind, this.cards.seen);
    if (card !== null) this.cards.offer([card]);
    showEffect(effect, this.stage);
    this.sfx.schedule(effectCues(effect));
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
    this.context.saves.update((save) => recordNotebook(save, this.level.data.id));
    this.views.toast.show(this.context.t('notebook.written'));
  }

  /**
   * Opens the garden that refutes the false statement `option` of notebook question `question` in
   * its own screen, while this one sleeps as it is; coming back wakes it and the notebook asks again.
   */
  private openCounterexample(question: number, option: number): void {
    const data: CounterexampleSceneData = {
      levelId: this.level.data.id,
      question,
      option,
      back: () => {
        this.scene.wake();
        this.presenter.counterexampleOver();
      },
    };
    this.scene.launch('counterexample', data);
    this.scene.sleep();
  }

  /**
   * Records the win at once; the victory panel waits its turn behind any lines or replay, and so
   * do its jingle, chosen now from the levels the win opens, and the notice of the Codex pages it
   * opens.
   */
  private win(stars: StarResult): void {
    const id = this.level.data.id;
    const { catalog, teacherMode, saves } = this.context;
    const shown = visibleLevels(
      catalog.map((level) => ({ id: level.data.id, draft: level.data.draft })),
      teacherMode,
    );
    const before = unlockedLevels(shown, saves.get(), teacherMode);
    const pages = codexSources(catalog);
    const pagesBefore = openCodex(pages, saves.get(), teacherMode);
    saves.update((save) => recordCompletion(save, id, stars.total));
    this.winJingle = victoryJingle(before, unlockedLevels(shown, saves.get(), teacherMode));
    this.codexNotice = pagesOpened(pagesBefore, openCodex(pages, saves.get(), teacherMode));
    // The first win that opens a page also brings the book's button.
    this.showBook();
    this.presenter.present({ kind: 'victory', stars });
  }

  /**
   * Shows the victory panel, offering the next level (if any) or the hub; a toast below it tells
   * when the win opened pages of the Codex.
   */
  private offerNext(stars: StarResult): void {
    const id = this.level.data.id;
    this.context.music.jingle(this.winJingle);
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
    if (this.codexNotice) this.views.toast.show(this.context.t('codex.unlocked'));
  }
}
