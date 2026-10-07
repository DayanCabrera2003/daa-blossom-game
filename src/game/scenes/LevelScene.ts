import Phaser from 'phaser';
import type { GardenState } from '@core/rules/state';
import type { Level } from '@levels/build';
import { visibleLevels } from '@services/progress';
import { recordCompletion, recordNotebook, writeSave } from '@services/save';
import { planAnimation } from '../animation/plan';
import type { Point } from '../input/target';
import { gardenPicture, NO_EXTRAS, type PointingExtras } from '../picture/garden';
import { hudPicture } from '../picture/hud';
import { checkText } from '../picture/mirrorDrawing';
import { pondPicture } from '../picture/pond';
import { reasonText } from '../picture/reasonText';
import {
  handle,
  openController,
  type Controller,
  type Effect,
  type UiEvent,
} from '../systems/levelController';
import { garden } from '../systems/levelSession';
import { playtestEntries } from '../systems/playtestEntries';
import { questionAt } from '../systems/question';
import { dayToReplay } from '../systems/replayDay';
import type { StarResult } from '../systems/stars';
import { AnimationView } from '../view/AnimationView';
import { DialogueView } from '../view/DialogueView';
import { fitCamera } from '../view/fitCamera';
import { FlowerView } from '../view/FlowerView';
import { FogView } from '../view/FogView';
import { GardenView } from '../view/GardenView';
import { HudView } from '../view/HudView';
import { MarksView } from '../view/MarksView';
import { MirrorView } from '../view/MirrorView';
import { NotebookView } from '../view/NotebookView';
import { ObjectsView } from '../view/ObjectsView';
import { QuestionView } from '../view/QuestionView';
import { SunSliderView } from '../view/SunSliderView';
import { ToastView } from '../view/ToastView';
import { ToolbarView } from '../view/ToolbarView';
import { VeilView } from '../view/VeilView';
import { showVictoryPanel } from '../view/VictoryPanel';
import type { CounterexampleSceneData } from './CounterexampleScene';
import { contextOf, type GameContext } from './context';
import { Presenter } from './presenter';

/** How often the HUD is refreshed while nothing happens, so a hint shows up when it is due. */
const HUD_REFRESH_MS = 500;

/**
 * A level being played. The scene takes no decision: it forwards the player's presses, keys and
 * buttons to the level controller, shows the effects it answers with, and repaints every layer from
 * the pure pictures of the garden and the HUD. Dialogue, questions, replays and the victory panel
 * go through the presenter (`presenter.ts`), which shows them in the order the presentation queue decides.
 */
export class LevelScene extends Phaser.Scene {
  private context!: GameContext;
  private level!: Level;
  private controller!: Controller;
  private labels: readonly string[] = [];
  private views!: {
    fog: FogView;
    flowers: FlowerView;
    objects: ObjectsView;
    garden: GardenView;
    marks: MarksView;
    mirror: MirrorView;
    animation: AnimationView;
    hud: HudView;
    toolbar: ToolbarView;
    sun: SunSliderView;
    toast: ToastView;
    dialogue: DialogueView;
  };
  private lastHudRefresh = 0;
  /** Shows lines, questions, replays and the victory panel one at a time, in the queue's order. */
  private presenter!: Presenter;
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
    this.lastHudRefresh = 0;
    this.context = contextOf(this);
    const level = this.context.catalog.find((candidate) => candidate.data.id === data.levelId);
    if (level === undefined) {
      this.scene.start('hub');
      return;
    }
    this.level = level;
    this.labels = level.data.sprouts.map((sprout) => sprout.label);
    const opened = openController(level, this.time.now);
    this.controller = opened.controller;
    this.context.playtest.record([
      { kind: 'levelStart', at: this.context.clock(), level: level.data.id },
    ]);
    const { t } = this.context;
    this.views = {
      fog: new FogView(this),
      flowers: new FlowerView(this),
      objects: new ObjectsView(this),
      garden: new GardenView(this),
      marks: new MarksView(this),
      mirror: new MirrorView(this, t),
      animation: new AnimationView(this),
      hud: new HudView(this, t, {
        done: () => this.dispatch({ kind: 'done' }),
        undo: () => this.dispatch({ kind: 'undo' }),
        redo: () => this.dispatch({ kind: 'redo' }),
        hint: () => this.dispatch({ kind: 'hint' }),
        back: () => this.leave(),
        checkMirror: () => this.dispatch({ kind: 'checkMirror' }),
      }),
      toolbar: new ToolbarView(this, t, (tool) => this.dispatch({ kind: 'tool', tool })),
      sun: new SunSliderView(this, (fraction) => this.dispatch({ kind: 'seek', fraction })),
      toast: new ToastView(this),
      dialogue: new DialogueView(this, t('dialogue.continue')),
    };
    this.presenter = new Presenter(
      this,
      {
        dialogue: this.views.dialogue,
        question: new QuestionView(this),
        notebook: new NotebookView(this),
        veil: new VeilView(this),
      },
      {
        showDay: (state) => (state === null ? this.render() : this.renderReplayed(state)),
        stopAnimation: () => this.views.animation.finish(),
        victory: (stars) => this.offerNext(stars),
        answer: (question, value) =>
          this.dispatch(
            question.kind === 'bet' ? { kind: 'bet', value } : { kind: 'answer', option: value },
          ),
        counterexample: (option) => this.openCounterexample(option),
      },
      { t, line: this.context.line },
    );
    this.listen();
    this.ready = true;
    // The script opens the level: its first lines, then whatever step waits for the player.
    for (const effect of opened.effects) this.show(effect);
    this.render();
  }

  override update(time: number): void {
    if (!this.ready) return;
    this.views.animation.update(time);
    this.views.mirror.update(time);
    this.presenter.update(time);
    if (time - this.lastHudRefresh > HUD_REFRESH_MS) {
      this.lastHudRefresh = time;
      this.renderHud();
    }
  }

  /** Pointer and keys go to the controller; touches on buttons and on the dialogue stay theirs. */
  private listen(): void {
    const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
    const free = (over: Phaser.GameObjects.GameObject[]) =>
      over.length === 0 && !this.views.dialogue.open;
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (free(over)) this.dispatch({ kind: 'press', point: at(pointer) });
      },
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.controller.pointer.chain !== null)
        this.dispatch({ kind: 'move', point: at(pointer) });
    });
    this.input.on(
      'pointerup',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (free(over)) this.dispatch({ kind: 'release', point: at(pointer) });
      },
    );
    const keys = this.input.keyboard;
    keys?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.dispatch({ kind: 'undo' });
    });
    keys?.on('keydown-Y', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.dispatch({ kind: 'redo' });
    });
    keys?.on('keydown-ESC', () => this.leave());
  }

  /**
   * One event through the controller; a new move ends any animation still playing. While the day
   * replays, the player's input waits: nothing reaches the controller.
   */
  private dispatch(event: UiEvent): void {
    if (this.presenter.blocksInput) return;
    if (event.kind !== 'move') this.views.animation.finish();
    const step = handle(this.controller, event, this.time.now);
    this.context.playtest.record(
      playtestEntries(this.controller, event, step, this.context.clock()),
    );
    this.controller = step.controller;
    for (const effect of step.effects) this.show(effect);
    this.render();
  }

  private show(effect: Effect): void {
    const { t, line } = this.context;
    switch (effect.kind) {
      case 'rejected':
        this.views.toast.show(reasonText(effect.reason, effect.action, this.labels, t));
        break;
      case 'drawRefused':
        this.views.toast.show(reasonText(effect.reason, null, this.labels, t));
        break;
      case 'mirrorChecked': {
        // What the check found is painted from the session; here it is told, and a player who
        // could not beat the garden is let go with a word from the mentor.
        const { key, params } = checkText(effect.check);
        this.views.toast.show(t(key, params));
        if (effect.check.kind === 'notBetter' && effect.check.spared)
          this.presenter.present({ kind: 'lines', lines: [t('mirror.spared')] });
        break;
      }
      case 'animate':
        this.views.animation.play(
          planAnimation(effect.events),
          this.controller.positions,
          this.time.now,
        );
        break;
      case 'hint': {
        const { content } = effect;
        this.presenter.hint(
          [content.generic ? t(content.line) : line(content.line)],
          content.option,
        );
        break;
      }
      case 'say':
        this.presenter.present({ kind: 'lines', lines: effect.lines.map(line) });
        break;
      case 'replay': {
        const { level, history } = this.controller.session;
        const day = dayToReplay(level, history.states, effect.demo);
        this.presenter.present({ kind: 'replay', day });
        break;
      }
      case 'won':
        this.win(effect.stars);
        break;
      case 'ask':
      case 'bet':
      case 'count':
      case 'notebook': {
        // The options and right answers come from the core, on the lanterns as they are now.
        const yours = garden(this.controller.session).matching;
        const question = questionAt(this.level, effect.step, yours);
        if (question !== null) this.presenter.present({ kind: 'question', question });
        break;
      }
      case 'answered':
        this.presenter.answered();
        break;
      case 'reveal': {
        const key = effect.bet === effect.right ? 'bet.revealRight' : 'bet.revealWrong';
        this.presenter.present({
          kind: 'lines',
          lines: [t(key, { bet: effect.bet, count: effect.right })],
        });
        break;
      }
      case 'play':
      case 'sproutTapped':
        // Nothing to draw: the garden simply takes moves, or the touched sprout is painted.
        break;
      case 'sun':
        // Nothing to draw: the sun is already on the top bar, and moving it ends the step.
        break;
      case 'counterexample':
        this.presenter.present({ kind: 'counterexample', option: effect.option });
        break;
      case 'written':
        this.writeNotebook();
        break;
      case 'mirror':
      case 'explore':
      case 'separate':
      case 'draw':
        // Nothing to queue: the pond, and the reflection drawn in it, are painted from the session.
        break;
    }
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

  /** Repaints the garden as the session shows it, with what the player is pointing at. */
  private render(): void {
    const { session, pointer, highlight } = this.controller;
    this.renderGarden(garden(session), {
      selection: pointer.selection,
      highlight,
      chain: pointer.chain,
    });
    const pond = pondPicture(session, this.controller.positions, this.labels);
    this.views.mirror.render(pond, this.time.now);
    this.renderHud();
  }

  /** Shows one state of a replayed day, with the sun where the replay stands. */
  private renderReplayed(state: GardenState): void {
    this.renderGarden(state, NO_EXTRAS);
    this.renderHud();
  }

  /** Repaints every layer of the garden from one state of it. */
  private renderGarden(state: GardenState, extras: PointingExtras): void {
    const picture = gardenPicture(state, this.controller.positions, this.labels, extras);
    this.views.fog.render(picture);
    this.views.flowers.render(picture.flowers);
    this.views.objects.render(picture);
    this.views.garden.render(picture);
    this.views.marks.render(picture.sprouts);
  }

  /** Repaints the HUD; while the day replays, the sun follows the replay instead of the session. */
  private renderHud(): void {
    const hud = hudPicture(this.controller.session, this.controller.pointer, this.time.now);
    this.views.hud.render(hud);
    this.views.toolbar.render(hud.tools, hud.tool);
    const replayed = this.presenter.replaySun;
    this.views.sun.render(replayed === null || hud.sun === null ? hud.sun : replayed);
  }
}
