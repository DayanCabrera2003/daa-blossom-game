import { describe, expect, it } from 'vitest';
import type { Point } from '../input/target';
import {
  BURST_MS,
  BURST_PETALS,
  PETAL_FRAMES,
  SPARK_FRAMES,
  SPARK_FRAME_MS,
  burstAt,
} from './burst';

const origin: Point = { x: 200, y: 120 };

describe('the sparkle and petals where a chain lands (GDD §4.1, key animation 1)', () => {
  it('is the same burst for the same seed, and another for another seed', () => {
    expect(burstAt(origin, 300, 7)).toEqual(burstAt(origin, 300, 7));
    expect(burstAt(origin, 300, 8)).not.toEqual(burstAt(origin, 300, 7));
  });

  it('bursts from the new lantern, every petal on a leaf of the strip', () => {
    const start = burstAt(origin, 0, 3);
    expect(start?.petals).toHaveLength(BURST_PETALS);
    for (const petal of start?.petals ?? []) {
      expect(petal.x).toBeCloseTo(origin.x);
      expect(petal.y).toBeCloseTo(origin.y);
      expect(petal.alpha).toBe(1);
      expect(Number.isInteger(petal.frame) && petal.frame >= 0).toBe(true);
      expect(petal.frame).toBeLessThan(PETAL_FRAMES);
    }
  });

  it('sparkles through its frames once, then only the petals are left', () => {
    const frames = Array.from(
      { length: SPARK_FRAMES },
      (_, i) => burstAt(origin, i * SPARK_FRAME_MS, 3)?.spark,
    );
    expect(frames).toEqual(Array.from({ length: SPARK_FRAMES }, (_, frame) => frame));
    expect(burstAt(origin, SPARK_FRAMES * SPARK_FRAME_MS, 3)?.spark).toBeNull();
    expect(burstAt(origin, SPARK_FRAMES * SPARK_FRAME_MS, 3)?.petals).toHaveLength(BURST_PETALS);
  });

  it('throws the petals up, lets them fall back and fade away', () => {
    const early = burstAt(origin, 150, 3)?.petals ?? [];
    const late = burstAt(origin, BURST_MS - 50, 3)?.petals ?? [];
    for (const petal of early) expect(petal.y).toBeLessThan(origin.y);
    early.forEach((petal, k) => {
      expect(late[k]?.y).toBeGreaterThan(petal.y);
      expect(late[k]?.alpha).toBeLessThan(petal.alpha);
    });
    for (const petal of late) expect(petal.alpha).toBeGreaterThan(0);
  });

  it('is over once its time is up, and has not begun before', () => {
    expect(burstAt(origin, BURST_MS, 3)).toBeNull();
    expect(burstAt(origin, -1, 3)).toBeNull();
  });
});

describe('the burst with less motion (plan 09, phase 6)', () => {
  it('throws no petals, but still sparkles over the new lantern for as long', () => {
    for (let elapsed = 0; elapsed < BURST_MS; elapsed += 20) {
      const reduced = burstAt(origin, elapsed, 7, true);
      const full = burstAt(origin, elapsed, 7);
      expect(reduced?.petals).toEqual([]);
      expect(reduced?.spark).toBe(full?.spark);
    }
    expect(burstAt(origin, BURST_MS, 7, true)).toBeNull();
  });
});
