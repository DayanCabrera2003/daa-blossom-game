import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { DRIFT_MARGIN, driftAt } from './drift';
import type { Drift } from './seasons';

const LEAVES: Drift = { image: 'fx.leaf', width: 12, height: 7, frames: 6, count: 8 };

describe('what drifts across a backdrop (leaves, snow)', () => {
  it('has as many particles as the season asks for, the same at the same moment', () => {
    expect(driftAt(LEAVES, 7, 1234)).toHaveLength(8);
    expect(driftAt(LEAVES, 7, 1234)).toEqual(driftAt(LEAVES, 7, 1234));
    expect(driftAt(LEAVES, 8, 1234)).not.toEqual(driftAt(LEAVES, 7, 1234));
  });

  it('keeps every particle on the canvas or just over its edge, on a frame of its strip', () => {
    for (let time = 0; time < 60_000; time += 777) {
      for (const { x, y, frame } of driftAt(LEAVES, 3, time)) {
        expect(x).toBeGreaterThanOrEqual(-DRIFT_MARGIN);
        expect(x).toBeLessThan(CANVAS_WIDTH + DRIFT_MARGIN);
        expect(y).toBeGreaterThanOrEqual(-DRIFT_MARGIN);
        expect(y).toBeLessThan(CANVAS_HEIGHT + DRIFT_MARGIN);
        expect(Number.isInteger(frame) && frame >= 0 && frame < LEAVES.frames).toBe(true);
      }
    }
  });

  it('falls a little at a time, and turns through its frames', () => {
    const before = driftAt(LEAVES, 3, 10_000);
    const after = driftAt(LEAVES, 3, 10_100);
    // A tenth of a second later each particle is lower, unless it has just come round to the top.
    const lower = before.filter((particle, k) => (after[k]?.y ?? 0) > particle.y);
    expect(lower.length).toBeGreaterThanOrEqual(before.length - 1);
    const frames = new Set(
      Array.from({ length: 30 }, (_, k) => driftAt(LEAVES, 3, k * 100)[0]?.frame),
    );
    expect(frames.size).toBe(LEAVES.frames);
  });
});
