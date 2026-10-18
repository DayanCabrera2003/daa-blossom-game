import type { Point } from '../input/target';

/**
 * The squash and stretch of the lantern hopping from one sprout to the next (GDD §4.1, key
 * animation 1): it crouches on the sprout it leaves, stretches as it flies up in an arc, squashes
 * as it lands on the next sprout and springs back to its own size. Its area stays the same all the
 * while (it is as wide as it is short), and every part flows into the next, so the hop never jerks.
 */

/** Where the lantern is during a hop, how high above the ground and how it is squashed. */
export interface HopPose {
  /** The point on the ground under it, on the way from one sprout to the other. */
  readonly x: number;
  readonly y: number;
  /** How high above that point it flies, in logical pixels. */
  readonly height: number;
  /** Its width and height against its own size: below 1 squashed that way, above 1 stretched. */
  readonly scaleX: number;
  readonly scaleY: number;
  /** How much of it shows, from 0 to 1: always all of it, but for a hop with less motion. */
  readonly alpha: number;
}

/** The top of the arc, in logical pixels above the ground. */
export const HOP_HEIGHT = 10;

/** The share of the hop spent crouching before it leaves, and landing after it touches down. */
const CROUCH = 0.15;
const LANDING = 0.2;
/** How much shorter it gets at its most squashed, and how much taller at its most stretched. */
const SQUASH = 0.25;
const STRETCH = 0.2;

/** The pose at `scaleY`: wider as it gets shorter, so its area stays the same. */
const sized = (ground: Point, height: number, scaleY: number): HopPose => ({
  x: ground.x,
  y: ground.y,
  height,
  scaleX: 1 / scaleY,
  scaleY,
  alpha: 1,
});

/**
 * The lantern hopping from `from` to `to`, `progress` (0 to 1) of the way through the hop. With
 * `reduced` motion (plan 09, phase 6) it does not fly: it fades out on the sprout it leaves during
 * the first half and fades in on the one it reaches during the second, at its own size.
 */
export function hopPose(from: Point, to: Point, progress: number, reduced = false): HopPose {
  const p = Math.min(1, Math.max(0, progress));
  if (reduced) {
    const ground = p < 0.5 ? from : to;
    return { ...sized(ground, 0, 1), alpha: Math.abs(1 - 2 * p) };
  }
  if (p <= CROUCH) return sized(from, 0, 1 - SQUASH * Math.sin(((Math.PI / 2) * p) / CROUCH));
  if (p >= 1 - LANDING) {
    const settled = (p - (1 - LANDING)) / LANDING;
    return sized(to, 0, 1 - SQUASH * Math.cos((Math.PI / 2) * settled));
  }
  // In the air: from squashed through stretched at the top back to squashed as it touches down.
  const t = (p - CROUCH) / (1 - CROUCH - LANDING);
  const arc = Math.sin(Math.PI * t);
  return sized(
    { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) },
    HOP_HEIGHT * 4 * t * (1 - t),
    1 - SQUASH + (SQUASH + STRETCH) * arc,
  );
}
