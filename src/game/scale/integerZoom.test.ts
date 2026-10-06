import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH, integerZoom } from './integerZoom';

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
});
