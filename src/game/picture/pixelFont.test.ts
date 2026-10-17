import { describe, expect, it } from 'vitest';
import { fontSize, PIXEL_FONT } from './pixelFont';

describe('the pixel font and the sizes it is drawn at (plan 06, section 1.2)', () => {
  it('draws body text (asked as 8) at the native size, one font pixel per logical pixel', () => {
    expect(fontSize(8)).toBe(PIXEL_FONT.nativeSize);
    expect(fontSize(10)).toBe(PIXEL_FONT.nativeSize);
  });

  it('draws titles and long text at twice the native size, never at a fraction of it', () => {
    expect(fontSize(12)).toBe(2 * PIXEL_FONT.nativeSize);
    expect(fontSize(16)).toBe(2 * PIXEL_FONT.nativeSize);
    expect(fontSize(24)).toBe(3 * PIXEL_FONT.nativeSize);
  });

  it('never goes below the native size, where letters would fall between pixels', () => {
    expect(fontSize(4)).toBe(PIXEL_FONT.nativeSize);
    expect(fontSize(0)).toBe(PIXEL_FONT.nativeSize);
  });

  it('keeps capitals at least 7 logical pixels high and cells a whole number of pixels wide', () => {
    expect(PIXEL_FONT.capHeight).toBeGreaterThanOrEqual(7);
    expect(Number.isInteger(PIXEL_FONT.advance)).toBe(true);
  });
});
