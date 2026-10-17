import { describe, expect, it } from 'vitest';
import { glassPixels } from './glass';

/** One RGBA pixel. */
const pixel = (r: number, g: number, b: number, a = 255): number[] => [r, g, b, a];

describe('a piece recoloured to glass (the greenhouse of the hub)', () => {
  it('keeps the light and shade of each pixel in the colour of the glass', () => {
    const out = glassPixels(
      new Uint8ClampedArray([...pixel(255, 255, 255), ...pixel(0, 0, 0), ...pixel(128, 128, 128)]),
      0x8feff1,
    );
    // White takes the colour of the glass itself; black its darkest shade; grey falls between.
    expect([...out.slice(0, 4)]).toEqual(pixel(0x8f, 0xef, 0xf1));
    const dark = [...out.slice(4, 8)];
    const grey = [...out.slice(8, 12)];
    for (let c = 0; c < 3; c++) {
      expect(dark[c]).toBeGreaterThan(0);
      expect(grey[c]).toBeGreaterThan(dark[c] ?? 0);
      expect(grey[c]).toBeLessThan(out[c] ?? 0);
    }
  });

  it('leaves what is see-through as it was, and the input untouched', () => {
    const input = new Uint8ClampedArray([...pixel(200, 100, 50, 0), ...pixel(10, 20, 30, 90)]);
    const out = glassPixels(input, 0x8feff1);
    expect(out[3]).toBe(0);
    expect(out[7]).toBe(90);
    expect([...input]).toEqual([...pixel(200, 100, 50, 0), ...pixel(10, 20, 30, 90)]);
  });

  it('turns two colours of the same brightness into the same glass', () => {
    // Pure red and a grey as bright to the eye.
    const out = glassPixels(
      new Uint8ClampedArray([...pixel(255, 0, 0), ...pixel(76, 76, 76)]),
      0x8feff1,
    );
    expect([...out.slice(0, 4)]).toEqual([...out.slice(4, 8)]);
  });
});
