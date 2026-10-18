import { describe, expect, it } from 'vitest';
import { inNinjaPalette } from './ninjaPalette';
import { AMBER_LANTERN, POND_RIPPLES, SILVER_LANTERN, swapColours } from './swapColours';

const pixel = (colour: number, alpha = 255): number[] => [
  (colour >> 16) & 0xff,
  (colour >> 8) & 0xff,
  colour & 0xff,
  alpha,
];

describe('swapping the colours of a pack sprite', () => {
  it('turns each listed colour into its swap and keeps the alpha', () => {
    const data = Uint8ClampedArray.from([...pixel(0xe0394c), ...pixel(0x8f3e56, 128)]);
    expect([...swapColours(data, AMBER_LANTERN)]).toEqual([
      ...pixel(AMBER_LANTERN.get(0xe0394c) ?? -1),
      ...pixel(AMBER_LANTERN.get(0x8f3e56) ?? -1, 128),
    ]);
  });

  it('leaves unlisted colours, transparent pixels and the given bytes as they were', () => {
    const data = Uint8ClampedArray.from([...pixel(0x141b1b), ...pixel(0xe0394c, 0)]);
    const swapped = swapColours(data, AMBER_LANTERN);
    expect([...swapped]).toEqual([...pixel(0x141b1b), ...pixel(0xe0394c, 0)]);
    expect(swapped).not.toBe(data);
  });

  it('refuses bytes that are not whole RGBA pixels', () => {
    expect(() => swapColours(new Uint8ClampedArray(3), AMBER_LANTERN)).toThrow(/RGBA/);
  });

  it('swaps only into colours of the palette: amber and silver lanterns, the pond in its water', () => {
    for (const table of [AMBER_LANTERN, SILVER_LANTERN, POND_RIPPLES])
      for (const [from, to] of table) {
        expect(inNinjaPalette(from)).toBe(true);
        expect(inNinjaPalette(to)).toBe(true);
      }
    // The red body of the pack's lantern becomes the lantern's own amber, and silver in the pond.
    expect(AMBER_LANTERN.get(0xe0394c)).toBe(0xef914f);
    expect(SILVER_LANTERN.get(0xe0394c)).toBe(0xb8dce5);
    expect(POND_RIPPLES.get(0x71ddee)).toBe(0x2d697b);
  });
});
