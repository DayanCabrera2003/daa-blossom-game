import type Phaser from 'phaser';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';

/**
 * The sun of the top bar (GDD 0.5): a slider over the day. Dragging the sun moves through the
 * history; the scene turns the position into a step (`systems/sun.ts`) and seeks the session.
 */
export class SunSliderView {
  private readonly knob: Phaser.GameObjects.Arc;
  private dragging = false;

  constructor(scene: Phaser.Scene, seek: (fraction: number) => void) {
    const { x0, x1, y } = LAYOUT.sunTrack;
    scene.add.graphics().setDepth(100).lineStyle(1, PALETTE.panelEdge).lineBetween(x0, y, x1, y);
    this.knob = scene.add
      .circle(x1, y, 4, PALETTE.sun)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    scene.input.setDraggable(this.knob);
    const fractionAt = (x: number) => (Math.max(x0, Math.min(x1, x)) - x0) / (x1 - x0);
    this.knob.on('dragstart', () => (this.dragging = true));
    this.knob.on('drag', (_: Phaser.Input.Pointer, dragX: number) => {
      this.knob.x = Math.max(x0, Math.min(x1, dragX));
      seek(fractionAt(dragX));
    });
    this.knob.on('dragend', () => (this.dragging = false));
  }

  render(sun: { readonly fraction: number }): void {
    if (this.dragging) return;
    const { x0, x1 } = LAYOUT.sunTrack;
    this.knob.x = x0 + sun.fraction * (x1 - x0);
  }
}
