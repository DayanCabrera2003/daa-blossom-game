import type Phaser from 'phaser';
import type { VertexId } from '@core/graph/types';
import type { SproutPicture } from '../picture/garden';
import { BADGE_BOX } from '../picture/badges';
import { paintBadge } from './paintBadge';
import { SPROUT_RADIUS } from './paintSprout';

/** From a sprout's middle up to the middle of its badge: above its body and its leaves. */
const BADGE_RISE = SPROUT_RADIUS + 4 + BADGE_BOX / 2;
/** How long the split badge takes to fade out, or back in, as it flashes. */
const FLASH_MS = 450;

/**
 * Sun and moon badges above sprouts, 8 × 8 pixels with a one-pixel outline (`picture/badges.ts`).
 * They differ in shape, not only in colour (GDD §4.1, colour-blind safe): a sun is a disc with
 * rays, a moon a crescent. The split badge (4.2), half sun with its rays and half moon, flashes
 * over the sprouts that can be either.
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
      const y = s.y - BADGE_RISE;
      if (split.includes(s.vertex)) paintBadge(h, 'split', s.x, y);
      else if (s.mark !== null) paintBadge(g, s.mark, s.x, y);
    }
  }
}
