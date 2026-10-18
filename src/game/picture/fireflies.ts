import type { Rect } from './boxDistance';
import type { Size } from './freeSpot';
import { lanternFlicker } from './lanternFlicker';

/**
 * The fireflies of the hub (plan 08, section 1.2): a few points of light of a pixel each that
 * drift slowly about a box over the hub's garden and glow in the three frames of a lantern's
 * flicker (`lanternFlicker.ts`), each out of step with the others. Pure: the view draws them where
 * this says at each instant.
 */

/** The box the fireflies drift in, kept clear of everything else on the hub. */
export const FIREFLY_BOX: Size = { width: 64, height: 20 };

/** How many fireflies there are. */
export const FIREFLY_COUNT = 6;

/** How bright a firefly is in each frame of a lantern's flicker: small, large, middle. */
export const FIREFLY_ALPHA = [0.45, 1, 0.7] as const;

/** A firefly at an instant: its pixel on the canvas and how bright it is. */
export interface Firefly {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/** How long a firefly takes to drift once across its box and once up and down it. */
const ACROSS_MS = 7000;
const UP_DOWN_MS = 5000;

/** The fireflies in `box` at the instant `now` (in milliseconds). */
export function firefliesAt(box: Rect, now: number): Firefly[] {
  const spanX = (box.width - 1) / 2;
  const spanY = (box.height - 1) / 2;
  return Array.from({ length: FIREFLY_COUNT }, (_, k) => {
    // Each its own pace and its own place along the way, so they never move together.
    const across = (2 * Math.PI * now) / (ACROSS_MS + 900 * k) + 1.7 * k;
    const upDown = (2 * Math.PI * now) / (UP_DOWN_MS + 700 * k) + 2.3 * k;
    return {
      x: box.x + Math.round(spanX * (1 + Math.sin(across))),
      y: box.y + Math.round(spanY * (1 + Math.sin(upDown))),
      alpha: FIREFLY_ALPHA[lanternFlicker(now, k).frame],
    };
  });
}
