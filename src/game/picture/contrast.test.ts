import { describe, expect, it } from 'vitest';
import { contrast, relativeLuminance } from './contrast';

describe('relative luminance and contrast (WCAG 2)', () => {
  it('gives 0 for black and 1 for white', () => {
    expect(relativeLuminance(0x000000)).toBe(0);
    expect(relativeLuminance(0xffffff)).toBeCloseTo(1, 10);
  });

  it('weighs green most and blue least, as the eye does', () => {
    const red = relativeLuminance(0xff0000);
    const green = relativeLuminance(0x00ff00);
    const blue = relativeLuminance(0x0000ff);
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
    expect(red + green + blue).toBeCloseTo(1, 10);
  });

  it('uses the linear segment for very dark channels', () => {
    // 10/255 is below the 0.04045 threshold: luminance is just the scaled value.
    expect(relativeLuminance(0x0a0a0a)).toBeCloseTo(10 / 255 / 12.92, 10);
  });

  it('runs from 1 for a colour against itself to 21 for black against white, either way round', () => {
    expect(contrast(0x4a5270, 0x4a5270)).toBe(1);
    expect(contrast(0x000000, 0xffffff)).toBeCloseTo(21, 10);
    expect(contrast(0xffffff, 0x000000)).toBeCloseTo(21, 10);
  });
});
