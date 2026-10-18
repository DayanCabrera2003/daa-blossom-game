import { describe, expect, it } from 'vitest';
import { fractionOfStep } from '../systems/sun';
import { backdropTint, DAY_TINTS, dayTint, mixColours, multiplyColours } from './dayTint';

describe('the tint of the backdrop over the day (plan 06, section 1.5)', () => {
  it('mixes and multiplies colours channel by channel', () => {
    expect(mixColours(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColours(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColours(0x102030, 0x304050, 0.5)).toBe(0x203040);
    expect(multiplyColours(0xffffff, 0x4a5270)).toBe(0x4a5270);
    expect(multiplyColours(0x808080, 0x808080)).toBe(0x404040);
    expect(multiplyColours(0x000000, 0xabcdef)).toBe(0x000000);
  });

  it('goes from dawn through the plain day and dusk to night', () => {
    expect(dayTint(0)).toBe(DAY_TINTS.dawn);
    expect(dayTint(1 / 3)).toBe(DAY_TINTS.day);
    expect(dayTint(2 / 3)).toBe(DAY_TINTS.dusk);
    expect(dayTint(1)).toBe(DAY_TINTS.night);
    expect(DAY_TINTS.day).toBe(0xffffff);
    // Halfway from the day to dusk, half of each.
    expect(dayTint(0.5)).toBe(mixColours(DAY_TINTS.day, DAY_TINTS.dusk, 0.5));
  });

  it('keeps a sun dragged past either end of the day at that end', () => {
    expect(dayTint(-0.4)).toBe(DAY_TINTS.dawn);
    expect(dayTint(7)).toBe(DAY_TINTS.night);
  });

  it('is night in the present of the day, where the player plays', () => {
    // The present is the last state of the history: the sun stands at dusk's far end, at night.
    for (const length of [1, 2, 9]) {
      expect(dayTint(fractionOfStep(length - 1, length))).toBe(DAY_TINTS.night);
    }
    // Before the sun unlocks there is no slider, and the garden is the present: night too.
    expect(dayTint(null)).toBe(DAY_TINTS.night);
  });

  it("multiplies the season's own tint by the hour", () => {
    expect(backdropTint(0xffffff, 1)).toBe(DAY_TINTS.night);
    expect(backdropTint(0xb8dce5, 1 / 3)).toBe(0xb8dce5);
    expect(backdropTint(0x808080, 1)).toBe(multiplyColours(0x808080, DAY_TINTS.night));
  });
});
