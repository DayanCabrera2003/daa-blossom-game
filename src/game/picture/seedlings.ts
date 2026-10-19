import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import type { Rect } from './boxDistance';
import { freeSpot } from './freeSpot';
import { HUB } from './hubLayout';

/**
 * The plants of the seeds (plan 08, section 1.2): each bet won plants one in the hub, side by side
 * from the left along the front strip of the garden's bed, clear of whatever is taken there (the
 * sign of the epilogue among it), and each sways through the four frames of its sheet out of step
 * with its neighbours. Pure: the view draws them where this says.
 */

/** The side of a frame of the plant's sheet. */
export const SEEDLING_SIZE = 16;

/**
 * The most plants there can be: one for each bet of the game (the one of 1.6 and four of 6.5). A
 * save from before 6.5 lost two of its bets may keep more bets won; it still shows this many.
 */
export const MAX_SEEDLINGS = 5;

/** The front strip of the hub's bed, along the bottom of the canvas, where the plants grow. */
export const SEEDLING_BAND: Rect = {
  x: HUB.margin,
  y: CANVAS_HEIGHT - SEEDLING_SIZE,
  width: CANVAS_WIDTH - 2 * HUB.margin,
  height: SEEDLING_SIZE,
};

/** How long each frame of a plant's sway shows. */
const SWAY_MS = 300;

/** The frames of the plant's sheet. */
const FRAMES = 4;

/**
 * Where the first `count` plants grow (no more than `MAX_SEEDLINGS`), each in the free spot of the
 * front strip furthest left, clear of `blocked` and of the plants before it; a plant with no room
 * is left out.
 */
export function seedlingSpots(count: number, blocked: readonly Rect[]): Rect[] {
  const spots: Rect[] = [];
  const size = { width: SEEDLING_SIZE, height: SEEDLING_SIZE };
  for (let k = 0; k < Math.min(count, MAX_SEEDLINGS); k++) {
    const spot = freeSpot(size, SEEDLING_BAND, SEEDLING_BAND.x, [...blocked, ...spots]);
    if (spot === null) break;
    spots.push(spot);
  }
  return spots;
}

/** The frame plant number `index` shows at the instant `now`. */
export function seedlingFrame(index: number, now: number): number {
  const step = Math.floor(now / SWAY_MS) + index;
  return ((step % FRAMES) + FRAMES) % FRAMES;
}
