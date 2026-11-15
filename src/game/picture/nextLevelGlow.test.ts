import { describe, expect, it } from 'vitest';
import { HUB } from './hubLayout';
import { NEXT_GLOW, nextLevelGlow } from './nextLevelGlow';

describe('the glow of the next level to play in the hub', () => {
  const button = { x: 100, y: 40, width: 30, height: 14 };

  it('rings the button a few pixels round its wood', () => {
    expect(nextLevelGlow(button)).toEqual({
      x: 100 - NEXT_GLOW.halo,
      y: 40 - NEXT_GLOW.halo,
      width: 30 + 2 * NEXT_GLOW.halo,
      height: 14 + 2 * NEXT_GLOW.halo,
    });
  });

  it('never reaches the button beside it nor the line below', () => {
    expect(NEXT_GLOW.halo).toBeGreaterThan(0);
    expect(NEXT_GLOW.halo).toBeLessThan(HUB.gap);
  });

  it('pulses gently: faint to bright, slowly, and holds between the two when moving less', () => {
    const { from, to } = NEXT_GLOW.alpha;
    expect(0 < from && from < to && to <= 1).toBe(true);
    expect(NEXT_GLOW.still).toBeGreaterThan(from);
    expect(NEXT_GLOW.still).toBeLessThan(to);
    expect(NEXT_GLOW.ms).toBeGreaterThanOrEqual(600);
  });
});
