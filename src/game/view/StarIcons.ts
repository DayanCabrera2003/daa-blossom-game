import type Phaser from 'phaser';
import { STAR_PIXELS, type RowStar } from '../picture/starIcon';
import { PALETTE } from './palette';

/**
 * Paints a row of stars (laid out by `picture/starIcon.ts`) with its top-left corner at (x, y):
 * the earned ones in sunlight, the ones still to win in dim wood. Returns the drawing, to move
 * or destroy it with what it belongs to.
 */
export function drawStars(
  scene: Phaser.Scene,
  x: number,
  y: number,
  stars: readonly RowStar[],
  depth: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth);
  for (const star of stars) {
    g.fillStyle(star.earned ? PALETTE.sun : PALETTE.buttonOff, 1);
    for (const pixel of STAR_PIXELS) g.fillRect(x + star.x + pixel.x, y + pixel.y, 1, 1);
  }
  return g;
}
