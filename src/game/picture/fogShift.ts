import { LOOK } from './look';

/**
 * How far the clouds over the night fog (chapter 3) have drifted at `now` (in milliseconds), for a
 * picture of clouds `width` pixels wide that repeats across the canvas: they drift at the speed of
 * the look table and come round after a width. With `reduced` motion (plan 09, phase 6) they stand
 * still; the veil and its clearings tell the same either way.
 */
export const fogShift = (now: number, width: number, reduced = false): number =>
  reduced ? 0 : (now * LOOK.fogDrift) % width;
