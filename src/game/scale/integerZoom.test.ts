import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH, cssPixel, integerZoom } from './integerZoom';

describe('integer zoom of the 480×270 canvas (GDD §4.1)', () => {
  it('fills common screens with whole pixels', () => {
    expect(integerZoom(1920, 1080)).toBe(4);
    expect(integerZoom(1440, 810)).toBe(3);
    expect(integerZoom(2560, 1440)).toBe(5);
    expect(integerZoom(3840, 2160)).toBe(8);
  });

  it('is limited by the tighter side', () => {
    expect(integerZoom(800, 600)).toBe(1);
    expect(integerZoom(1920, 600)).toBe(2);
  });

  it('never goes below 1, even in a tiny window', () => {
    expect(integerZoom(100, 50)).toBe(1);
    expect(integerZoom(0, 0)).toBe(1);
  });

  it('property: the zoomed canvas always fits, and one more step would not (above zoom 1)', () => {
    fc.assert(
      fc.property(fc.nat(8000), fc.nat(5000), (width, height) => {
        const zoom = integerZoom(width, height);
        expect(Number.isInteger(zoom) && zoom >= 1).toBe(true);
        if (zoom > 1) {
          expect(CANVAS_WIDTH * zoom).toBeLessThanOrEqual(width);
          expect(CANVAS_HEIGHT * zoom).toBeLessThanOrEqual(height);
        }
        const next = zoom + 1;
        expect(CANVAS_WIDTH * next > width || CANVAS_HEIGHT * next > height).toBe(true);
      }),
    );
  });

  it('is chosen in device pixels: a dense phone held sideways gets ×4, not ×1 (plan 09, phase 7)', () => {
    // 844 × 390 CSS pixels at density 3: 2532 × 1170 device pixels.
    expect(integerZoom(844, 390, 3)).toBe(4);
    expect(cssPixel(4, 3)).toBeCloseTo(4 / 3);
    // 412 × 915 sideways at density 2.625: 2405 × 1082 device pixels.
    expect(integerZoom(915, 412, 2.625)).toBe(4);
  });

  it('at density 1 it is the zoom in CSS pixels it always was', () => {
    for (const [width, height] of [
      [1920, 1080],
      [1440, 810],
      [1366, 768],
      [800, 600],
    ] as const) {
      expect(integerZoom(width, height, 1)).toBe(integerZoom(width, height));
      expect(cssPixel(integerZoom(width, height), 1)).toBe(integerZoom(width, height));
    }
  });

  it('reads a window side whose device pixels come out a hair short as the whole pixels it spans', () => {
    // 1536 × 864 CSS pixels at density 1.25 are exactly 1920 × 1080 device pixels.
    expect(integerZoom(1536, 864, 1.25)).toBe(4);
    expect(integerZoom(1536.0000001, 863.9999999, 1.25)).toBe(4);
  });

  it('takes a density the browser cannot give (zero, negative, not a number) as 1', () => {
    for (const density of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(integerZoom(1920, 1080, density)).toBe(4);
      expect(cssPixel(4, density)).toBe(4);
    }
  });

  it('property: in device pixels, the zoomed canvas fits the window, and one more step would not', () => {
    fc.assert(
      fc.property(
        fc.nat(4000),
        fc.nat(3000),
        fc.constantFrom(1, 1.25, 1.5, 2, 2.625, 2.75, 3, 3.5, 4),
        (width, height, density) => {
          const zoom = integerZoom(width, height, density);
          const deviceWidth = Math.floor(width * density + 1e-6);
          const deviceHeight = Math.floor(height * density + 1e-6);
          if (zoom > 1) {
            expect(CANVAS_WIDTH * zoom).toBeLessThanOrEqual(deviceWidth);
            expect(CANVAS_HEIGHT * zoom).toBeLessThanOrEqual(deviceHeight);
            // Never bigger than the window in CSS pixels either.
            expect(CANVAS_WIDTH * cssPixel(zoom, density)).toBeLessThanOrEqual(width + 1e-6);
          }
          const next = zoom + 1;
          expect(CANVAS_WIDTH * next > deviceWidth || CANVAS_HEIGHT * next > deviceHeight).toBe(
            true,
          );
        },
      ),
    );
  });
});
