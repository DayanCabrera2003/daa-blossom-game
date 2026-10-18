import { describe, expect, it } from 'vitest';
import { PALETTE } from '../view/palette';
import { contrast } from './contrast';
import { LOOK, LOOK_RANGES, LOOK_TONES } from './look';

/** Every number a look's value holds: itself, or each of a row of them. */
const numbersOf = (value: number | readonly number[]): readonly number[] =>
  typeof value === 'number' ? [value] : value;

describe('the numbers of the look, tuned by eye (plan 09, phase 2)', () => {
  it.each(Object.keys(LOOK) as (keyof typeof LOOK)[])('%s is within its range', (name) => {
    const [min, max] = LOOK_RANGES[name];
    expect(min).toBeLessThan(max);
    for (const value of numbersOf(LOOK[name])) {
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it('keeps the values the reviews of plan 06 saw on screen', () => {
    expect(LOOK.fogCloudAlpha).toBe(0.16);
    expect(LOOK.scarecrowGap).toBe(5);
    expect(LOOK.conflictBlinks).toBe(3);
  });

  it('gives each frame of a halo both rings, the outer one wider and fainter', () => {
    const rings = [
      LOOK.haloInnerRadius,
      LOOK.haloInnerAlpha,
      LOOK.haloOuterRadius,
      LOOK.haloOuterAlpha,
    ];
    for (const ring of rings) expect(ring).toHaveLength(3);
    LOOK.haloInnerRadius.forEach((inner, i) => {
      expect(LOOK.haloOuterRadius[i]).toBeGreaterThan(inner);
      expect(LOOK.haloOuterAlpha[i]).toBeLessThan(LOOK.haloInnerAlpha[i] ?? 0);
    });
  });

  it('never lights a halo in the colour of a sprout in the dark', () => {
    for (const tone of [...LOOK_TONES.haloAmber, ...LOOK_TONES.haloSilver])
      expect(contrast(PALETTE[tone], PALETTE.dark)).toBeGreaterThanOrEqual(3);
  });

  it('blinks the conflict between two colours, neither of them the red of a wrong chain', () => {
    const { conflictSun, conflictMoon } = LOOK_TONES;
    expect(PALETTE[conflictSun]).not.toBe(PALETTE[conflictMoon]);
    for (const tone of [conflictSun, conflictMoon])
      expect(PALETTE[tone]).not.toBe(PALETTE.chainWrong);
  });
});
