import type Phaser from 'phaser';
import type { FlowerPicture } from '../picture/garden';
import { flowerLooks } from '../picture/petals';
import { paintFlower } from './paintFlower';
import { PALETTE } from './palette';

/**
 * Folded flowers (GDD §4.1, plan 06 section 1.4): in the middle of the sprouts each flower on top
 * folds, a 32 × 32 flower of as many petals as its cycle has sprouts, with the flower folded inside
 * it smaller in its middle; round its sprouts, the outline that can be touched, faintly filled,
 * and the thinner outlines of the flowers nested in it (the "Layers" view, GDD 5.2).
 */
export class FlowerView {
  private readonly outlines: Phaser.GameObjects.Graphics;
  private readonly petals: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.outlines = scene.add.graphics().setDepth(10);
    this.petals = scene.add.graphics().setDepth(11);
  }

  render(flowers: readonly FlowerPicture[]): void {
    const g = this.outlines.clear();
    for (const flower of flowers) {
      const points = flower.outline as Phaser.Types.Math.Vector2Like[];
      if (flower.depth === 0) g.fillStyle(PALETTE.flower, 0.1).fillPoints(points, true);
      g.lineStyle(1, PALETTE.flower, 0.8 - 0.2 * Math.min(flower.depth, 3)).strokePoints(
        points,
        true,
      );
    }
    const p = this.petals.clear();
    for (const look of flowerLooks(flowers)) paintFlower(p, look.centre, look.petals, look.inner);
  }
}
