import type Phaser from 'phaser';
import type { VertexId } from '@core/graph/types';
import type { SproutPicture } from '../picture/garden';
import { SPROUT_RADIUS } from './GardenView';
import { PALETTE } from './palette';

/** Size of a mark badge above a sprout (GDD §4.1: 8 × 8). */
const BADGE = 4;
/** How long the split badge takes to fade out, or back in, as it flashes. */
const FLASH_MS = 450;

/**
 * Sun and moon badges above sprouts. They differ in shape, not only in colour (GDD §4.1,
 * colour-blind safe): a sun is a disc with rays, a moon a crescent. The split badge (4.2), half
 * sun with its rays and half moon, flashes over the sprouts that can be either.
 */
export class MarksView {
  private readonly badges: Phaser.GameObjects.Graphics;
  private readonly split: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.badges = scene.add.graphics().setDepth(40);
    this.split = scene.add.graphics().setDepth(40);
    scene.tweens.add({
      targets: this.split,
      alpha: 0.2,
      duration: FLASH_MS,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Paints the marks of `sprouts`; those in `split` wear the split badge instead. */
  render(sprouts: readonly SproutPicture[], split: readonly VertexId[] = []): void {
    const g = this.badges.clear();
    const h = this.split.clear();
    for (const s of sprouts) {
      const x = s.x;
      const y = s.y - SPROUT_RADIUS - BADGE - 2;
      if (split.includes(s.vertex)) {
        this.splitBadge(h, x, y);
      } else if (s.mark === 'sun') {
        g.fillStyle(PALETTE.sun).fillCircle(x, y, BADGE - 1);
        this.rays(g, x, y, 0, 8);
      } else if (s.mark === 'moon') {
        g.fillStyle(PALETTE.moon).fillCircle(x, y, BADGE);
        g.fillStyle(PALETTE.background).fillCircle(x + 2, y - 1, BADGE - 1);
      }
    }
  }

  /** Rays of a sun badge: `count` of the eight, going round from the angle `from` (in eighths). */
  private rays(g: Phaser.GameObjects.Graphics, x: number, y: number, from: number, count: number) {
    g.lineStyle(1, PALETTE.sun);
    for (let k = from; k < from + count; k++) {
      const angle = (k * Math.PI) / 4;
      g.lineBetween(
        x + Math.cos(angle) * BADGE,
        y + Math.sin(angle) * BADGE,
        x + Math.cos(angle) * (BADGE + 2),
        y + Math.sin(angle) * (BADGE + 2),
      );
    }
  }

  /** Half a sun on the left, with its rays, and half a moon on the right. */
  private splitBadge(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(PALETTE.sun);
    g.slice(x, y, BADGE, Math.PI / 2, (3 * Math.PI) / 2, false).fillPath();
    this.rays(g, x, y, 3, 3);
    g.fillStyle(PALETTE.moon);
    g.slice(x, y, BADGE, -Math.PI / 2, Math.PI / 2, false).fillPath();
  }
}
