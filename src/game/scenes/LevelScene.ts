import Phaser from 'phaser';
import type { Level } from '@levels/build';
import { visibleLevels } from '@services/progress';
import { recordCompletion, writeSave } from '@services/save';
import { planAnimation } from '../animation/plan';
import type { Point } from '../input/target';
import { gardenPicture } from '../picture/garden';
import { hudPicture } from '../picture/hud';
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
import type { StarResult } from '../systems/stars';
import { AnimationView } from '../view/AnimationView';
import { DialogueView } from '../view/DialogueView';
import { FlowerView } from '../view/FlowerView';
import { FogView } from '../view/FogView';
import { GardenView } from '../view/GardenView';
import { HudView } from '../view/HudView';
import { MarksView } from '../view/MarksView';
import { ObjectsView } from '../view/ObjectsView';
import { SunSliderView } from '../view/SunSliderView';
import { ToastView } from '../view/ToastView';
import { ToolbarView } from '../view/ToolbarView';
import { showVictoryPanel } from '../view/VictoryPanel';
import { contextOf, type GameContext } from './context';

/** How often the HUD is refreshed while nothing happens, so a hint shows up when it is due. */
const HUD_REFRESH_MS = 500;

/**
 * A level being played. The scene takes no decision: it forwards the player's presses, keys and
 * buttons to the level controller, shows the effects it answers with, and repaints every layer from
 * the pure pictures of the garden and the HUD.
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
    animation: AnimationView;
    hud: HudView;
    toolbar: ToolbarView;
    sun: SunSliderView;
    toast: ToastView;
    dialogue: DialogueView;
  };
  private lastHudRefresh = 0;
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
      animation: new AnimationView(this),
      hud: new HudView(this, t, {
        done: () => this.dispatch({ kind: 'done' }),
        undo: () => this.dispatch({ kind: 'undo' }),
        redo: () => this.dispatch({ kind: 'redo' }),
        hint: () => this.dispatch({ kind: 'hint' }),
        back: () => this.leave(),
      }),
      toolbar: new ToolbarView(this, t, (tool) => this.dispatch({ kind: 'tool', tool })),
      sun: new SunSliderView(this, (fraction) => this.dispatch({ kind: 'seek', fraction })),
      toast: new ToastView(this),
      dialogue: new DialogueView(this, t('dialogue.continue')),
    };
    this.listen();
    this.ready = true;
    // The script opens the level: its first lines, then whatever step waits for the player.
    for (const effect of opened.effects) this.show(effect);
    this.render();
  }

  override update(time: number): void {
    if (!this.ready) return;
    this.views.animation.update(time);
    if (time - this.lastHudRefresh > HUD_REFRESH_MS) {
      this.lastHudRefresh = time;
      this.renderHud();
    }
  }

  /** Pointer and keys go to the controller; touches on buttons and on the dialogue stay theirs. */
  private listen(): void {
    const at = (pointer: Phaser.Input.Pointer): Point => ({ x: pointer.x, y: pointer.y });
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

  /** One event through the controller; a new move ends any animation still playing. */
  private dispatch(event: UiEvent): void {
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
      case 'animate':
        this.views.animation.play(
          planAnimation(effect.events),
          this.controller.positions,
          this.time.now,
        );
        break;
      case 'hint':
        this.views.dialogue.say([
          effect.content.generic ? t(effect.content.line) : line(effect.content.line),
        ]);
        break;
      case 'say':
        this.views.dialogue.say(effect.lines.map(line));
        break;
      case 'won':
        this.win(effect.stars);
        break;
      case 'play':
      case 'answered':
      case 'sproutTapped':
        // Nothing to draw: the garden simply takes moves, or the answer is logged (phase 10).
        break;
      case 'sun':
      case 'replay':
        // The sun as a step and the replayed day are drawn in plan 03, phase 3.
        break;
      case 'ask':
      case 'bet':
        // Questions and bets get their panel in plan 03, phase 4.
        break;
      case 'notebook':
        // The notebook is opened in plan 03, phase 6.
        break;
      case 'mirror':
      case 'explore':
      case 'separate':
      case 'count':
        // The pond (reflection, tangle, threads and counts) is drawn in plan 03, phase 7.
        break;
      case 'draw':
        // The mirror challenge is drawn in plan 03, phase 8.
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

  /** Records the win, then offers the next level (if any) or the hub. */
  private win(stars: StarResult): void {
    const id = this.level.data.id;
    this.context.save = recordCompletion(this.context.save, id, stars.total);
    writeSave(this.context.storage, this.context.save);
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

  private render(): void {
    const { session, pointer, highlight, positions } = this.controller;
    const picture = gardenPicture(garden(session), positions, this.labels, {
      selection: pointer.selection,
      highlight,
      chain: pointer.chain,
    });
    this.views.fog.render(picture);
    this.views.flowers.render(picture.flowers);
    this.views.objects.render(picture);
    this.views.garden.render(picture);
    this.views.marks.render(picture.sprouts);
    this.renderHud();
  }

  private renderHud(): void {
    const hud = hudPicture(this.controller.session, this.controller.pointer, this.time.now);
    this.views.hud.render(hud);
    this.views.toolbar.render(hud.tools, hud.tool);
    this.views.sun.render(hud.sun);
  }
}
