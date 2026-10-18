import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { colourDistance, nearestColour } from './nearestColour';

const PALETTE = [0x141b1b, 0xef914f, 0x79b8ce, 0xffffff] as const;

describe('nearestColour', () => {
  it('gives back a colour that is already in the palette', () => {
    for (const colour of PALETTE) expect(nearestColour(colour, PALETTE)).toBe(colour);
  });

  it('takes the palette colour closest in red, green and blue', () => {
    expect(nearestColour(0x000000, PALETTE)).toBe(0x141b1b);
    expect(nearestColour(0xf0a050, PALETTE)).toBe(0xef914f);
    expect(nearestColour(0x80c0d0, PALETTE)).toBe(0x79b8ce);
    expect(nearestColour(0xfafafa, PALETTE)).toBe(0xffffff);
  });

  it('keeps the first of two colours at the same distance', () => {
    expect(nearestColour(0x808080, [0x7f7f7f, 0x818181])).toBe(0x7f7f7f);
    expect(nearestColour(0x808080, [0x818181, 0x7f7f7f])).toBe(0x818181);
  });

  it('always answers a colour of the palette, and none of it is closer', () => {
    const colour = fc.integer({ min: 0, max: 0xffffff });
    fc.assert(
      fc.property(colour, fc.array(colour, { minLength: 1, maxLength: 12 }), (wanted, palette) => {
        const nearest = nearestColour(wanted, palette);
        expect(palette).toContain(nearest);
        const best = colourDistance(wanted, nearest);
        for (const other of palette)
          expect(colourDistance(wanted, other)).toBeGreaterThanOrEqual(best);
      }),
    );
  });

  it('measures no distance from a colour to itself, and the same both ways', () => {
    expect(colourDistance(0x123456, 0x123456)).toBe(0);
    expect(colourDistance(0x000000, 0x010203)).toBe(1 + 4 + 9);
    expect(colourDistance(0x010203, 0x000000)).toBe(14);
  });

  it('refuses an empty palette', () => {
    expect(() => nearestColour(0x123456, [])).toThrow(/empty palette/);
  });
});
