import { describe, expect, it } from 'vitest';
import { recolourPixels } from './recolourPixels';

const PALETTE = [0x141b1b, 0xef914f, 0xffffff] as const;

describe('recolourPixels', () => {
  it('maps every pixel onto its nearest palette colour, keeping its alpha', () => {
    const data = Uint8ClampedArray.from([0, 0, 0, 255, 0xf0, 0xa0, 0x50, 128, 250, 250, 250, 255]);
    expect([...recolourPixels(data, PALETTE)]).toEqual([
      0x14, 0x1b, 0x1b, 255, 0xef, 0x91, 0x4f, 128, 0xff, 0xff, 0xff, 255,
    ]);
  });

  it('leaves fully transparent pixels as they are', () => {
    const data = Uint8ClampedArray.from([10, 20, 30, 0]);
    expect([...recolourPixels(data, PALETTE)]).toEqual([10, 20, 30, 0]);
  });

  it('returns new bytes and leaves the given ones untouched', () => {
    const data = Uint8ClampedArray.from([0, 0, 0, 255]);
    const recoloured = recolourPixels(data, PALETTE);
    expect(recoloured).not.toBe(data);
    expect([...data]).toEqual([0, 0, 0, 255]);
  });

  it('refuses bytes that are not whole RGBA pixels', () => {
    expect(() => recolourPixels(new Uint8ClampedArray(5), PALETTE)).toThrow(/RGBA/);
  });
});
