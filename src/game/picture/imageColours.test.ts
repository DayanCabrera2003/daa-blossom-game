import { describe, expect, it } from 'vitest';
import { imageColours } from './imageColours';

/** RGBA bytes from `[0xrrggbb, alpha]` pixels. */
const pixels = (...list: readonly (readonly [number, number])[]): Uint8ClampedArray =>
  Uint8ClampedArray.from(
    list.flatMap(([colour, alpha]) => [
      (colour >> 16) & 0xff,
      (colour >> 8) & 0xff,
      colour & 0xff,
      alpha,
    ]),
  );

describe('imageColours', () => {
  it('lists each opaque colour once, in reading order', () => {
    const data = pixels([0x141b1b, 255], [0xef914f, 255], [0x141b1b, 255], [0x79b8ce, 255]);
    expect(imageColours(data)).toEqual([0x141b1b, 0xef914f, 0x79b8ce]);
  });

  it('leaves out the pixels that are not fully opaque', () => {
    const data = pixels([0x000000, 0], [0xef914f, 128], [0xffffff, 255]);
    expect(imageColours(data)).toEqual([0xffffff]);
  });

  it('gives nothing for an empty image', () => {
    expect(imageColours(new Uint8ClampedArray(0))).toEqual([]);
  });

  it('refuses bytes that are not whole RGBA pixels', () => {
    expect(() => imageColours(new Uint8ClampedArray(6))).toThrow(/RGBA/);
  });
});
