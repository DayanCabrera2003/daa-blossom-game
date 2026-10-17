import { describe, expect, it } from 'vitest';
import { fontMetrics, fontSize, PIXEL_FONT } from './pixelFont';

describe('the pixel font and the sizes it is drawn at (plan 06, section 1.2)', () => {
  it('draws the sizes the greybox asked for (8 to 12) at the native size, pixel for pixel', () => {
    expect(fontSize(8)).toBe(PIXEL_FONT.nativeSize);
    expect(fontSize(10)).toBe(PIXEL_FONT.nativeSize);
    expect(fontSize(12)).toBe(PIXEL_FONT.nativeSize);
  });

  it('draws long text, asked as twice 8, at twice the native size, never at a fraction of it', () => {
    expect(fontSize(16)).toBe(2 * PIXEL_FONT.nativeSize);
    expect(fontSize(20)).toBe(2 * PIXEL_FONT.nativeSize);
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

  it('gives each line room for accented capitals above and descenders below, at every scale', () => {
    // An accent sits 3 pixels over a capital; descenders go 2 under the baseline.
    expect(PIXEL_FONT.ascent).toBeGreaterThanOrEqual(PIXEL_FONT.capHeight + 3);
    expect(fontMetrics(8)).toEqual({
      ascent: PIXEL_FONT.ascent,
      descent: PIXEL_FONT.descent,
      fontSize: PIXEL_FONT.ascent + PIXEL_FONT.descent,
    });
    expect(fontMetrics(16)).toEqual({
      ascent: 2 * PIXEL_FONT.ascent,
      descent: 2 * PIXEL_FONT.descent,
      fontSize: 2 * (PIXEL_FONT.ascent + PIXEL_FONT.descent),
    });
  });
});
