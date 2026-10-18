import { describe, expect, it } from 'vitest';
import { LOOK } from './look';
import { fogShift } from './fogShift';

describe('how far the clouds of the fog have drifted', () => {
  it('drifts at the speed of the look table, coming round after a picture width', () => {
    expect(fogShift(0, 128)).toBe(0);
    expect(fogShift(1000, 128)).toBeCloseTo((1000 * LOOK.fogDrift) % 128);
    expect(fogShift(128 / LOOK.fogDrift, 128)).toBeCloseTo(0);
  });

  it('stands still with less motion (plan 09, phase 6)', () => {
    for (const now of [0, 1000, 123_456]) expect(fogShift(now, 128, true)).toBe(0);
  });
});
