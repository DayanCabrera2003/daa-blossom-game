import { itemAt } from '@core/shared/itemAt';
import { centroid } from '../input/flowerShape';
import type { Point } from '../input/target';

/**
 * Lifting a stone and watching the garden split (GDD §4.1, key animation 4): the stone drops onto
 * its sprout, faster and faster, squashes as it hits and settles; then the odd groups it leaves
 * part from each other for a moment, glowing, and come back to the outlines the garden draws for
 * them. Pure in the time, so the views only ask what shows now.
 */

/** How high above its sprout the stone starts, in logical pixels. */
export const STONE_DROP = 16;
/** How long the drop takes, and how long the stone takes to settle after it hits. */
export const STONE_FALL_MS = 70;
export const STONE_SETTLE_MS = 110;

/** How much shorter the stone gets as it hits. */
const SQUASH = 0.3;
/** How far the groups part from each other at most, in logical pixels. */
const SPLIT = 6;

/** The stone in the air or settling: its height over the sprout and its squash. */
export interface StonePose {
  readonly height: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

/** The stone `elapsed` ms after it is let go, or null once it rests on its sprout. */
export function stoneFall(elapsed: number): StonePose | null {
  const e = Math.max(0, elapsed);
  if (e <= STONE_FALL_MS) {
    const t = e / STONE_FALL_MS;
    return { height: STONE_DROP * (1 - t * t), scaleX: 1, scaleY: 1 };
  }
  const settled = (e - STONE_FALL_MS) / STONE_SETTLE_MS;
  if (settled >= 1) return null;
  const scaleY = 1 - SQUASH * (1 - settled);
  return { height: 0, scaleX: 1 / scaleY, scaleY };
}

/** One odd group while the garden parts: its outline moved away from the others, and its glow. */
export interface GroupApart {
  readonly outline: readonly Point[];
  readonly alpha: number;
}

/**
 * The odd groups (their outlines in `groups`) `elapsed` ms into a stone step of `duration` ms:
 * from the moment the stone lands, each moves away from the middle of them all and back, glowing
 * as it goes. Empty before the stone lands and once the step is over.
 */
export function groupsApart(
  groups: readonly (readonly Point[])[],
  elapsed: number,
  duration: number,
): GroupApart[] {
  const s = (elapsed - STONE_FALL_MS) / (duration - STONE_FALL_MS);
  if (s <= 0 || s >= 1) return [];
  const swell = Math.sin(Math.PI * s);
  const middles = groups.map(centroid);
  const all = centroid(middles);
  return groups.map((outline, i): GroupApart => {
    const own = itemAt(middles, i);
    const away = Math.hypot(own.x - all.x, own.y - all.y);
    const [dx, dy] = away === 0 ? [0, 0] : [(own.x - all.x) / away, (own.y - all.y) / away];
    return {
      outline: outline.map((p) => ({ x: p.x + SPLIT * swell * dx, y: p.y + SPLIT * swell * dy })),
      alpha: swell,
    };
  });
}
