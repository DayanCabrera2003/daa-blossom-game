import { createRng } from '@core/shared/rng';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import type { Drift } from './seasons';

/**
 * Where the particles of a backdrop are at a moment (the leaves of the wild garden, the snow of the
 * recipe book): each falls at its own pace and sways from side to side, and comes back in at the
 * top once it has left at the bottom. Pure in the time, so the view only asks where they are now.
 */

/** How far past an edge of the canvas a particle goes before it comes back in. */
export const DRIFT_MARGIN = 12;

/** How long each frame of a particle's strip shows, in milliseconds. */
const FRAME_MS = 180;

/** One particle now: where its top-left corner is, and which frame of its strip it shows. */
export interface DriftParticle {
  readonly x: number;
  readonly y: number;
  readonly frame: number;
}

/** `value` brought into [0, `size`). */
const wrap = (value: number, size: number): number => ((value % size) + size) % size;

/** The particles of `drift` at `time` (in milliseconds), their paths drawn from `seed`. */
export function driftAt(drift: Drift, seed: number, time: number): DriftParticle[] {
  const rng = createRng(seed);
  const seconds = time / 1000;
  const [width, height] = [CANVAS_WIDTH + 2 * DRIFT_MARGIN, CANVAS_HEIGHT + 2 * DRIFT_MARGIN];
  return Array.from({ length: drift.count }, (_, k) => {
    const start = { x: rng.next() * width, y: rng.next() * height };
    // Pixels per second down, and a sway of a few pixels every few seconds.
    const fall = 10 + rng.next() * 14;
    const sway = 4 + rng.next() * 8;
    const period = 2 + rng.next() * 3;
    const phase = rng.next() * 2 * Math.PI;
    const swing = sway * Math.sin((2 * Math.PI * seconds) / period + phase);
    return {
      x: Math.floor(wrap(start.x + swing, width)) - DRIFT_MARGIN,
      y: Math.floor(wrap(start.y + fall * seconds, height)) - DRIFT_MARGIN,
      frame: wrap(Math.floor(time / FRAME_MS) + k, drift.frames),
    };
  });
}
