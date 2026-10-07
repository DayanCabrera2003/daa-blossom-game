import type Phaser from 'phaser';
import type { SproutPicture } from '../picture/garden';
import { SPROUT_RADIUS } from './GardenView';
import { PALETTE } from './palette';

/** Size of a mark badge above a sprout (GDD §4.1: 8 × 8). */
const BADGE = 4;

/**
 * Sun and moon badges above sprouts. They differ in shape, not only in colour (GDD §4.1,
 * colour-blind safe): a sun is a disc with rays, a moon a crescent.
 */
export class MarksView {
  private readonly badges: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.badges = scene.add.graphics().setDepth(40);
  }

  render(sprouts: readonly SproutPicture[]): void {
    const g = this.badges.clear();
    for (const s of sprouts) {
      const x = s.x;
      const y = s.y - SPROUT_RADIUS - BADGE - 2;
      if (s.mark === 'sun') {
        g.fillStyle(PALETTE.sun).fillCircle(x, y, BADGE - 1);
        g.lineStyle(1, PALETTE.sun);
        for (let k = 0; k < 8; k++) {
          const angle = (k * Math.PI) / 4;
          g.lineBetween(
            x + Math.cos(angle) * BADGE,
            y + Math.sin(angle) * BADGE,
            x + Math.cos(angle) * (BADGE + 2),
            y + Math.sin(angle) * (BADGE + 2),
          );
        }
      } else if (s.mark === 'moon') {
        g.fillStyle(PALETTE.moon).fillCircle(x, y, BADGE);
        g.fillStyle(PALETTE.background).fillCircle(x + 2, y - 1, BADGE - 1);
      }
    }
  }
}
