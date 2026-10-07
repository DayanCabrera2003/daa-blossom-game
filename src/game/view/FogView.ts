import type Phaser from 'phaser';
import type { GardenPicture } from '../picture/garden';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { PALETTE } from './palette';

/**
 * Night fog of the greenhouse (chapter 3) in greybox: a dark veil over the garden with a clearing
 * around each inspected sprout. Vines hidden by the fog are simply not drawn by the garden view.
 */
export class FogView {
  private readonly veil: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.veil = scene.add.graphics().setDepth(5);
  }

  render(picture: GardenPicture): void {
    const g = this.veil.clear();
    if (picture.fog === null) return;
    g.fillStyle(PALETTE.fog, 0.55).fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    picture.sprouts.forEach((sprout) => {
      if (picture.fog?.revealed[sprout.vertex])
        g.fillStyle(PALETTE.fogClear, 0.9).fillCircle(sprout.x, sprout.y, 22);
    });
  }
}
