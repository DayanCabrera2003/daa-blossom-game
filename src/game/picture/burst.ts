import { createRng } from '@core/shared/rng';
import type { Point } from '../input/target';
import { LOOK } from './look';

/**
 * The burst where a winning chain lands (GDD §4.1, key animation 1: "el último farol aparece con
 * un destello y confeti de pétalos"): the pack's spark plays its frames once over the new lantern,
 * while a handful of pink petals are thrown up from it, fall back, sway and fade. Pure in the time
 * since the landing, so the view only asks what shows now.
 */

/** How long the burst lasts, in milliseconds. */
export const BURST_MS = LOOK.burstMs;
/** The spark's strip: how many frames, and how long each one shows. */
export const SPARK_FRAMES = 7;
export const SPARK_FRAME_MS = 60;
/** How many petals are thrown, and how many leaves their strip has. */
export const BURST_PETALS = 10;
export const PETAL_FRAMES = 6;

/** Pulls the petals back down, in pixels per second squared. */
const GRAVITY = 240;
/** The share of the burst after which the petals start to fade. */
const FADE_FROM = 0.6;

/** One petal now: where its middle is, which leaf of the strip it is, and how opaque. */
export interface BurstPetal {
  readonly x: number;
  readonly y: number;
  readonly frame: number;
  readonly alpha: number;
}

/** What shows of a burst: the spark's frame (null once it is over) and the petals. */
export interface Burst {
  readonly spark: number | null;
  readonly petals: readonly BurstPetal[];
}

/** The burst from `origin`, `elapsed` ms after the landing, its petals thrown as `seed` says. */
export function burstAt(origin: Point, elapsed: number, seed: number): Burst | null {
  if (elapsed < 0 || elapsed >= BURST_MS) return null;
  const rng = createRng(seed);
  const t = elapsed / 1000;
  const share = elapsed / BURST_MS;
  const alpha = share <= FADE_FROM ? 1 : (1 - share) / (1 - FADE_FROM);
  const petals = Array.from({ length: BURST_PETALS }, (): BurstPetal => {
    // Pixels per second: up, and a little to either side; then a sway of a couple of pixels.
    const across = -40 + rng.next() * 80;
    const up = 50 + rng.next() * 30;
    const sway = 1 + rng.next() * 2;
    const frame = rng.int(PETAL_FRAMES);
    return {
      x: origin.x + across * t + sway * Math.sin(8 * t),
      y: origin.y - up * t + (GRAVITY * t * t) / 2,
      frame,
      alpha,
    };
  });
  const spark = Math.floor(elapsed / SPARK_FRAME_MS);
  return { spark: spark < SPARK_FRAMES ? spark : null, petals };
}
