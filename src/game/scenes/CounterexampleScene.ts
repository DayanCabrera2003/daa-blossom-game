import Phaser from 'phaser';
import { size } from '@core/matching/queries';
import { invariant } from '@core/shared/invariant';
import { counterexampleAt } from '@levels/counterexample';
import { planAnimation } from '../animation/plan';
import type { Point } from '../input/target';
import { availableTools } from '../input/tools';
import { gardenPicture } from '../picture/garden';
import { checkText, drawingPicture } from '../picture/mirrorDrawing';
import { reasonText } from '../picture/reasonText';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import {
  handleCounterexample,
  openCounterexample,
  shownGarden,
  type CounterexampleController,
  type CounterexampleEffect,
  type CounterexampleEvent,
} from '../systems/counterexampleController';
import { counterexampleEntries } from '../systems/counterexampleEntries';
import { canRedo, canUndo } from '../systems/history';
import { AnimationView } from '../view/AnimationView';
import { Button } from '../view/Button';
import { DialogueView } from '../view/DialogueView';
import { fitCamera } from '../view/fitCamera';
import { FlowerView } from '../view/FlowerView';
import { FogView } from '../view/FogView';
import { GardenView } from '../view/GardenView';
import { LAYOUT } from '../view/layout';
import { MarksView } from '../view/MarksView';
import { MirrorView } from '../view/MirrorView';
import { ObjectsView } from '../view/ObjectsView';
import { PALETTE } from '../view/palette';
import { textStyle } from '../view/textStyle';
import { ToastView } from '../view/ToastView';
import { ToolbarView } from '../view/ToolbarView';
import { contextOf, type GameContext } from './context';

/** What the level scene gives the counterexample screen when it opens it. */
export interface CounterexampleSceneData {
  readonly levelId: string;
  /** The false statement of the level's notebook whose garden opens. */
  readonly option: number;
  /** Called once the player goes back to the notebook. */
  readonly back: () => void;
}

/**
 * The garden that refutes a false notebook statement (GDD §5.5, plan 03, phase 6), opened over the
 * sleeping level screen. The statement stays on top, the mentor presents the garden, and the player
 * moves lanterns with the counterexample's tools under the core's rules, with no victory, until
 * "Volver al Cuaderno" takes them back to the question. In a `mirrorDraw` garden (2.4 c) the player
 * draws a reflection instead, checks it with "Comprobar", and sees the chain it leaves. Every decision is the pure controller's
 * (`systems/counterexampleController.ts`); this scene forwards touches and draws what it answers.
 */
export class CounterexampleScene extends Phaser.Scene {
  private context!: GameContext;
  private controller!: CounterexampleController;
  /** The level whose notebook opened this garden, for the playtest log. */
  private levelId = '';
  private labels: readonly string[] = [];
  private views!: {
    fog: FogView;
    flowers: FlowerView;
    objects: ObjectsView;
    garden: GardenView;
    marks: MarksView;
    mirror: MirrorView;
    animation: AnimationView;
    toolbar: ToolbarView;
    toast: ToastView;
    dialogue: DialogueView;
    lanterns: Phaser.GameObjects.Text;
    undo: Button;
    redo: Button;
    check: Button;
  };
  /** Whether a press started on this screen: the touch that opened it must not end here as a tap. */
  private pressing = false;

  constructor() {
    super('counterexample');
  }

  create(data: CounterexampleSceneData): void {
    fitCamera(this);
    this.context = contextOf(this);
    this.pressing = false;
    const { t, line } = this.context;
    const level = this.context.catalog.find((candidate) => candidate.data.id === data.levelId);
    const statement = level?.data.notebook?.options[data.option];
    const counterexample = level === undefined ? null : counterexampleAt(level, data.option);
    invariant(
      level?.data.notebook !== undefined && statement !== undefined && counterexample !== null,
      'the level opens only the counterexamples of its own notebook',
    );
    this.controller = openCounterexample(counterexample);
    this.levelId = data.levelId;
    this.labels = counterexample.data.sprouts.map((sprout) => sprout.label);

    // The false statement stays on top, so the player knows what the garden answers.
    const said = `${line(level.data.notebook.prompt)} ${line(statement.line)}`;
    this.add
      .text(LAYOUT.margin, LAYOUT.topY, said, {
        ...textStyle(8, PALETTE.lit),
        wordWrap: { width: CANVAS_WIDTH - 2 * LAYOUT.margin },
      })
      .setDepth(100);
    this.views = {
      fog: new FogView(this),
      flowers: new FlowerView(this),
      objects: new ObjectsView(this),
      garden: new GardenView(this),
      marks: new MarksView(this),
      mirror: new MirrorView(this, t),
      animation: new AnimationView(this),
      toolbar: new ToolbarView(this, t, (tool) => this.dispatch({ kind: 'tool', tool })),
      toast: new ToastView(this),
      dialogue: new DialogueView(this, t('dialogue.continue')),
      lanterns: this.add.text(LAYOUT.margin, LAYOUT.bottomY, '', textStyle(8)).setDepth(100),
      ...this.buttons(data.back),
    };
    this.listen(data.back);
    this.views.dialogue.say([line(counterexample.line)]);
    this.render();
  }

  override update(time: number): void {
    this.views.animation.update(time);
    this.views.mirror.update(time);
  }

  /**
   * Undo, redo and the way back, at the bottom right as on the level screen; "Comprobar" for a
   * drawn reflection, shown only in a `mirrorDraw` garden.
   */
  private buttons(back: () => void): { undo: Button; redo: Button; check: Button } {
    const { t } = this.context;
    const leave = new Button(this, 0, LAYOUT.bottomY, t('counterexample.back'), () =>
      this.leave(back),
    );
    const redo = new Button(this, 0, LAYOUT.bottomY, t('hud.redo'), () =>
      this.dispatch({ kind: 'redo' }),
    );
    const undo = new Button(this, 0, LAYOUT.bottomY, t('hud.undo'), () =>
      this.dispatch({ kind: 'undo' }),
    );
    const check = new Button(this, 0, LAYOUT.bottomY, t('hud.checkMirror'), () =>
      this.dispatch({ kind: 'checkMirror' }),
    );
    let x = CANVAS_WIDTH - LAYOUT.margin;
    for (const button of [leave, redo, undo, check]) {
      x -= button.width + 3;
      button.moveTo(x, LAYOUT.bottomY);
    }
    return { undo, redo, check };
  }

  /** Pointer and keys go to the controller; touches on buttons and on the dialogue stay theirs. */
  private listen(back: () => void): void {
    const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.worldX, y: pointer.worldY });
    const free = (over: Phaser.GameObjects.GameObject[]) =>
      over.length === 0 && !this.views.dialogue.open;
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (!free(over)) return;
        this.pressing = true;
        this.dispatch({ kind: 'press', point: at(pointer) });
      },
    );
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && this.controller.pointer.chain !== null)
        this.dispatch({ kind: 'move', point: at(pointer) });
    });
    this.input.on(
      'pointerup',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (!this.pressing || !free(over)) return;
        this.pressing = false;
        this.dispatch({ kind: 'release', point: at(pointer) });
      },
    );
    const keys = this.input.keyboard;
    keys?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.dispatch({ kind: 'undo' });
    });
    keys?.on('keydown-Y', (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) this.dispatch({ kind: 'redo' });
    });
    keys?.on('keydown-ESC', () => this.leave(back));
  }

  /** One event through the controller; a new move ends any animation still playing. */
  private dispatch(event: CounterexampleEvent): void {
    if (event.kind !== 'move') this.views.animation.finish();
    const step = handleCounterexample(this.controller, event);
    this.context.playtest.record(
      counterexampleEntries(this.levelId, step.effects, this.context.clock()),
    );
    this.controller = step.controller;
    for (const effect of step.effects) this.show(effect);
    this.render();
  }

  private show(effect: CounterexampleEffect): void {
    const { t, line } = this.context;
    switch (effect.kind) {
      case 'rejected':
        this.views.toast.show(reasonText(effect.reason, effect.action, this.labels, t));
        break;
      case 'drawRefused':
        this.views.toast.show(reasonText(effect.reason, null, this.labels, t));
        break;
      case 'animate': {
        const steps = planAnimation(effect.events);
        this.views.animation.play(steps, this.controller.positions, this.time.now);
        break;
      }
      case 'say':
        this.views.dialogue.say([line(effect.line)]);
        break;
      case 'mirrorChecked': {
        // What the check found is painted from the controller on every render; here it is told.
        const { key, params } = checkText(effect.check);
        this.views.toast.show(t(key, params));
        break;
      }
    }
  }

  /** Back to the notebook: this screen closes and the level screen asks again. */
  private leave(back: () => void): void {
    this.scene.stop();
    back();
  }

  /**
   * Repaints the garden, the lanterns lit, the tools and what undo and redo can do; in a
   * `mirrorDraw` garden, the drawn reflection and your lanterns against it instead.
   */
  private render(): void {
    const { controller } = this;
    const state = shownGarden(controller);
    const { pointer } = controller;
    const picture = gardenPicture(state, controller.positions, this.labels, {
      selection: pointer.selection,
      highlight: [],
      chain: pointer.chain,
    });
    this.views.fog.render(picture);
    this.views.flowers.render(picture.flowers);
    this.views.objects.render(picture);
    this.views.garden.render(picture);
    this.views.marks.render(picture.sprouts);
    this.views.toolbar.render(availableTools(state.allowed), pointer.tool);
    const { history, challenge } = controller;
    const { t } = this.context;
    const drawing =
      challenge === null
        ? null
        : drawingPicture(state.matching, challenge, controller.positions, this.labels);
    this.views.mirror.render(drawing, this.time.now);
    this.views.lanterns.setText(
      challenge === null
        ? t('hud.lanterns', { count: size(state.matching) })
        : t('hud.mirror', { yours: size(state.matching), mirror: size(challenge.draft) }),
    );
    this.views.undo.setEnabled(canUndo(history)).setVisible(challenge === null);
    this.views.redo.setEnabled(canRedo(history)).setVisible(challenge === null);
    this.views.check.setVisible(challenge !== null);
  }
}
