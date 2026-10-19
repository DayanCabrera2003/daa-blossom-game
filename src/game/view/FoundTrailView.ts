import type Phaser from 'phaser';
import type { TrailSegment } from '../picture/foundTrail';
import { GARDEN_DEPTHS } from '../picture/gardenDepths';
import { PALETTE } from './palette';

/** Length of a dash of the trail and of the space after it, in logical pixels. */
const DASH = 3;
const SPACE = 3;

/**
 * The found trail (plan 10, phase 2; GDD §5.1, "El gesto de levantar"): the stretches of the chain
 * the light found, a dotted gold line over the vines and under the lanterns, painted from its
 * picture (`picture/foundTrail.ts`) and decided nowhere here.
 */
export class FoundTrailView {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(GARDEN_DEPTHS.foundTrail);
  }

  render(segments: readonly TrailSegment[]): void {
    const g = this.graphics.clear().lineStyle(2, PALETTE.foundTrail, 0.9);
    for (const [a, b] of segments) {
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = 0; s < length; s += DASH + SPACE) {
        const t0 = s / length;
        const t1 = Math.min(length, s + DASH) / length;
        g.lineBetween(
          a.x + t0 * (b.x - a.x),
          a.y + t0 * (b.y - a.y),
          a.x + t1 * (b.x - a.x),
          a.y + t1 * (b.y - a.y),
        );
      }
    }
  }
}
