import type Phaser from 'phaser';
import type { GardenPicture } from '../picture/garden';
import { SPROUT_RADIUS } from './GardenView';
import { PALETTE } from './palette';

/**
 * What sits on sprouts: stones (a lifted sprout turns into a grey stone) and scarecrows (a cross
 * guarding every vine of its sprout), and, with stones lifted, the outline of each odd group the
 * garden falls into (GDD §4.1, key animation 4).
 */
export class ObjectsView {
  private readonly groups: Phaser.GameObjects.Graphics;
  private readonly objects: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.groups = scene.add.graphics().setDepth(12);
    this.objects = scene.add.graphics().setDepth(35);
  }

  render(picture: GardenPicture): void {
    const groups = this.groups.clear().lineStyle(1, PALETTE.oddGroup);
    for (const outline of picture.oddGroups)
      groups.strokePoints(outline as Phaser.Types.Math.Vector2Like[], true);

    const g = this.objects.clear();
    for (const s of picture.sprouts) {
      if (s.stone) {
        g.fillStyle(PALETTE.stone).fillRect(
          s.x - SPROUT_RADIUS,
          s.y - SPROUT_RADIUS,
          2 * SPROUT_RADIUS,
          2 * SPROUT_RADIUS,
        );
      }
      if (s.scarecrow) {
        const r = SPROUT_RADIUS + 2;
        g.lineStyle(2, PALETTE.scarecrow)
          .lineBetween(s.x - r, s.y - r, s.x + r, s.y + r)
          .lineBetween(s.x - r, s.y + r, s.x + r, s.y - r);
      }
    }
  }
}
