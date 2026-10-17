import { describe, expect, it } from 'vitest';
import { NINJA_PALETTE, inNinjaPalette } from './ninjaPalette';

describe('the 53 colours of the Ninja Adventure palette (plan 06, section 1.1)', () => {
  it('lists 53 different colours, each a 24-bit RGB value', () => {
    expect(NINJA_PALETTE).toHaveLength(53);
    expect(new Set(NINJA_PALETTE).size).toBe(53);
    for (const colour of NINJA_PALETTE) {
      expect(Number.isInteger(colour) && colour >= 0 && colour <= 0xffffff).toBe(true);
    }
  });

  it('holds the darkest and the lightest tone of the sheet', () => {
    expect(inNinjaPalette(0x141b1b)).toBe(true);
    expect(inNinjaPalette(0xffffff)).toBe(true);
  });

  it('refuses a colour that is not in the sheet', () => {
    expect(inNinjaPalette(0x1d2433)).toBe(false);
  });
});
