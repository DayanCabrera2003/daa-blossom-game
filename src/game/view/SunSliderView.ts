import type Phaser from 'phaser';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';

/**
 * The sun of the top bar (GDD 0.5): a slider over the day. Dragging the sun, or pressing anywhere on
 * its track, moves through the history; the scene turns the position into a step (`systems/sun.ts`)
 * and seeks the session. While the script waits for the sun, a ring pulses around it. Before the
 * level where it unlocks, neither the track nor the sun is shown.
 */
export class SunSliderView {
  private readonly track: Phaser.GameObjects.Graphics;
  /** The track's touch area: a press anywhere on it moves the sun there. */
  private readonly hitArea: Phaser.GameObjects.Zone;
  private readonly knob: Phaser.GameObjects.Arc;
  /** A ring that pulses around the sun while the script waits for it to move. */
  private readonly call: Phaser.GameObjects.Arc;
  private readonly pulse: Phaser.Tweens.Tween;
  private dragging = false;

  constructor(scene: Phaser.Scene, seek: (fraction: number) => void) {
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
    this.knob = scene.add
      .circle(x1, y, 6, PALETTE.sun)
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
  }

  /**
   * Places the sun on its track, pulsing while it `calls` for the player, or hides it all while the
   * sun is locked (`null`).
   */
  render(sun: { readonly fraction: number; readonly calling: boolean } | null): void {
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
