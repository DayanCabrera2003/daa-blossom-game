import type Phaser from 'phaser';
import type { FlowerPicture } from '../picture/garden';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/**
 * Folded flowers in greybox: an outline around their petals, numbered, nested outlines inside
 * outer ones and thinner the deeper they are (the "Layers" view, GDD 5.2). The real petals and
 * their folding animation arrive at the art phase.
 */
export class FlowerView {
  private readonly outlines: Phaser.GameObjects.Graphics;
  private readonly numbers: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.outlines = scene.add.graphics().setDepth(10);
  }

  render(flowers: readonly FlowerPicture[]): void {
    const g = this.outlines.clear();
    for (const flower of flowers) {
      const points = flower.outline as Phaser.Types.Math.Vector2Like[];
      if (flower.depth === 0) g.fillStyle(PALETTE.flower, 0.12).fillPoints(points, true);
      g.lineStyle(
        flower.depth === 0 ? 2 : 1,
        PALETTE.flower,
        1 - 0.25 * Math.min(flower.depth, 3),
      ).strokePoints(points, true);
    }
    while (this.numbers.length < flowers.length) {
      this.numbers.push(
        this.scene.add.text(0, 0, '', textStyle(7, PALETTE.flower)).setOrigin(0.5, 1).setDepth(11),
      );
    }
    this.numbers.forEach((text, i) => {
      const flower = flowers[i];
      if (flower === undefined) {
        text.setVisible(false);
        return;
      }
      const top = flower.outline.reduce((best, p) => (p.y < best.y ? p : best));
      text
        .setVisible(true)
        .setText(`#${flower.id}`)
        .setPosition(top.x, top.y - 1);
    });
  }
}
