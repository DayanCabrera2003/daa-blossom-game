import type Phaser from 'phaser';
import { SUN_ICON } from '../picture/buttonIcon';
import { addFocusable } from './focusables';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';

/** Where the sun stands on its track, and how many states the day has. */
export interface SunPosition {
  readonly fraction: number;
  readonly steps: number;
}

/**
 * The sun of the top bar (GDD 0.5): a slider over the day, its handle the sun icon of the pack.
 * Dragging the sun, or pressing anywhere on its track, moves through the history; the scene turns
 * the position into a step (`systems/sun.ts`) and seeks the session. While the script waits for the sun, a ring pulses around it. Before the
 * level where it unlocks, neither the track nor the sun is shown. The keyboard's focus reaches it,
 * and the side arrows move the sun a step, the same seek a drag to that step makes.
 */
export class SunSliderView {
  private readonly track: Phaser.GameObjects.Graphics;
  /** The track's touch area: a press anywhere on it moves the sun there. */
  private readonly hitArea: Phaser.GameObjects.Zone;
  /** The sun of the pack (`Sun.png`), or a disc while its picture is not loaded. */
  private readonly knob: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  /** A ring that pulses around the sun while the script waits for it to move. */
  private readonly call: Phaser.GameObjects.Arc;
  private readonly pulse: Phaser.Tweens.Tween;
  private dragging = false;
  /** Where the sun stands and how many states the day has, as last shown. */
  private shown: SunPosition = { fraction: 1, steps: 1 };

  /**
   * `seek` gets a position from 0 to 1; `arrow` gets a side arrow on the sun in focus, with where the
   * sun stands and how many states the day has, for the scene to seek the step beside it.
   */
  constructor(
    scene: Phaser.Scene,
    seek: (fraction: number) => void,
    arrow: (direction: -1 | 1, sun: SunPosition) => void,
  ) {
    const { x0, x1, y } = LAYOUT.sunTrack;
    this.track = scene.add
      .graphics()
      .setDepth(100)
      .lineStyle(1, PALETTE.panelEdge)
      .lineBetween(x0, y, x1, y);
    const fractionAt = (x: number) => (Math.max(x0, Math.min(x1, x)) - x0) / (x1 - x0);
    this.hitArea = scene.add
      .zone((x0 + x1) / 2, y, x1 - x0 + 12, 14)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });
    this.hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.knob.x = Math.max(x0, Math.min(x1, pointer.worldX));
      seek(fractionAt(pointer.worldX));
    });
    this.call = scene.add
      .circle(x1, y, 6)
      .setStrokeStyle(1, PALETTE.sun)
      .setDepth(101)
      .setVisible(false);
    this.pulse = scene.tweens.add({
      targets: this.call,
      scale: 1.8,
      alpha: 0,
      duration: 900,
      repeat: -1,
      paused: true,
    });
    const { texture, scale } = SUN_ICON;
    this.knob = (
      scene.textures.exists(texture)
        ? scene.add.image(x1, y, texture).setScale(scale)
        : scene.add.circle(x1, y, 6, PALETTE.sun)
    )
      .setDepth(102)
      .setInteractive({ useHandCursor: true });
    scene.input.setDraggable(this.knob);
    this.knob.on('dragstart', () => (this.dragging = true));
    this.knob.on('drag', (_: Phaser.Input.Pointer, dragX: number) => {
      this.knob.x = Math.max(x0, Math.min(x1, dragX));
      this.call.x = this.knob.x;
      seek(fractionAt(dragX));
    });
    this.knob.on('dragend', () => (this.dragging = false));
    addFocusable(scene, {
      box: () => ({ x: x0 - 6, y: y - 6, width: x1 - x0 + 12, height: 13 }),
      depth: () => 102,
      live: () => this.hitArea.visible,
      // Enter on the sun has nothing to press: the arrows move it.
      press: () => undefined,
      adjust: (direction) => arrow(direction, this.shown),
    });
  }

  /**
   * Places the sun on its track, pulsing while it `calls` for the player, or hides it all while the
   * sun is locked (`null`).
   */
  render(
    sun: {
      readonly fraction: number;
      readonly calling: boolean;
      /** How many states the day has; a replayed day leaves it out, and the last one is kept. */
      readonly steps?: number;
    } | null,
  ): void {
    if (sun !== null) {
      this.shown = { fraction: sun.fraction, steps: sun.steps ?? this.shown.steps };
    }
    this.track.setVisible(sun !== null);
    this.knob.setVisible(sun !== null);
    this.hitArea.setVisible(sun !== null);
    const calling = sun?.calling === true;
    this.call.setVisible(calling);
    if (calling && this.pulse.isPaused()) this.pulse.resume();
    if (!calling && !this.pulse.isPaused()) this.pulse.pause();
    if (sun === null || this.dragging) return;
    const { x0, x1 } = LAYOUT.sunTrack;
    this.knob.x = x0 + sun.fraction * (x1 - x0);
    this.call.x = this.knob.x;
  }
}
