import { describe, expect, it } from 'vitest';
import { contrast } from '../src/game/picture/contrast';
import { inNinjaPalette } from '../src/game/picture/ninjaPalette';
import { css, PALETTE } from '../src/game/view/palette';

// The colours the engine paints (plan 06, section 1.1): all of them from the pack's palette, and
// the three that carry the puzzle (a lit lantern, a sprout in the dark, the ground under both)
// far enough apart in brightness to tell them apart with no colour at all (GDD §4.1).

/** Contrast ratios the palette must keep; WCAG asks 4.5 of body text and 3 of large shapes. */
const MIN_LIT_ON_BACKGROUND = 4.5;
const MIN_LIT_ON_DARK = 3;
const MIN_DARK_ON_BACKGROUND = 2;

describe('the palette the engine paints', () => {
  it.each(Object.entries(PALETTE))('%s is a colour of the Ninja Adventure palette', (_, colour) => {
    expect(inNinjaPalette(colour)).toBe(true);
  });

  it('keeps the tokens of the plan, e.g. an amber lantern and a bluish sprout in the dark', () => {
    expect(PALETTE.background).toBe(0x141b1b);
    expect(PALETTE.lit).toBe(0xef914f);
    expect(PALETTE.chainGain).toBe(PALETTE.lit);
    expect(PALETTE.dark).toBe(0x4a5270);
    expect(PALETTE.sun).toBe(0xf1c471);
    expect(PALETTE.moon).toBe(0x79b8ce);
  });

  it('reads a lit lantern apart from a dark sprout, and both apart from the ground, in grey', () => {
    expect(contrast(PALETTE.lit, PALETTE.background)).toBeGreaterThanOrEqual(MIN_LIT_ON_BACKGROUND);
    expect(contrast(PALETTE.lit, PALETTE.dark)).toBeGreaterThanOrEqual(MIN_LIT_ON_DARK);
    expect(contrast(PALETTE.dark, PALETTE.background)).toBeGreaterThanOrEqual(
      MIN_DARK_ON_BACKGROUND,
    );
  });

  it('writes a colour as the six-digit CSS string text styles expect', () => {
    expect(css(PALETTE.background)).toBe('#141b1b');
  });
});
