import { boxesOverlap, type Rect } from './boxDistance';

/** What a home on the hub must hold. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** The clear space kept between a spot and anything taken. */
const GAP = 1;

/**
 * Where a box of `size` fits in `region` clear of every box in `blocked` (by a pixel), as near
 * the wished left edge `wish` as can be and, at that edge, as low in the region as it goes: the
 * cosmetics of the hub find their homes with this. Positions are whole pixels; null when nothing
 * fits. Pure: the same question always has the same answer.
 */
export function freeSpot(
  size: Size,
  region: Rect,
  wish: number,
  blocked: readonly Rect[],
): Rect | null {
  const left = region.x;
  const right = region.x + region.width - size.width;
  const top = region.y;
  const bottom = region.y + region.height - size.height;
  if (right < left || bottom < top) return null;
  // Only what reaches into the region can be in the way.
  const near = blocked.filter((box) => boxesOverlap(box, region, GAP));
  const start = Math.max(left, Math.min(right, Math.round(wish)));
  // Left edges by distance from the wish, the one on the left first on a tie.
  for (let step = 0; start - step >= left || start + step <= right; step++) {
    for (const x of step === 0 ? [start] : [start - step, start + step]) {
      if (x < left || x > right) continue;
      for (let y = bottom; y >= top; y--) {
        const spot = { x, y, ...size };
        if (near.every((box) => !boxesOverlap(spot, box, GAP))) return spot;
      }
    }
  }
  return null;
}
