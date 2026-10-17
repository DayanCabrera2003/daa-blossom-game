import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BAYER_4, clearingPixels, DITHER_EDGE, isOpen } from './fogDither';

const key = ({ x, y }: { x: number; y: number }): string => `${x},${y}`;

describe('the dithered clearings of the fog', () => {
  it('uses the 4 × 4 Bayer matrix: every threshold from 0 to 15 once', () => {
    expect(BAYER_4.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  it('opens every pixel well inside the radius and none outside it', () => {
    const r = 20;
    for (let dy = -r - 2; dy <= r + 2; dy++) {
      for (let dx = -r - 2; dx <= r + 2; dx++) {
        const d = Math.hypot(dx, dy);
        if (d < r - DITHER_EDGE) expect(isOpen(dx, dy, r)).toBe(true);
        if (d >= r) expect(isOpen(dx, dy, r)).toBe(false);
      }
    }
  });

  it('frays its rim: on the edge, some pixels are open and some are not', () => {
    const rim = clearingPixels(20).filter(({ x, y }) => Math.hypot(x, y) >= 20 - DITHER_EDGE);
    expect(rim.length).toBeGreaterThan(0);
    let closed = 0;
    for (let dy = -20; dy <= 20; dy++)
      for (let dx = -20; dx <= 20; dx++) {
        const d = Math.hypot(dx, dy);
        if (d >= 20 - DITHER_EDGE && d < 20 && !isOpen(dx, dy, 20)) closed++;
      }
    expect(closed).toBeGreaterThan(0);
  });

  it('grows with the radius without closing a pixel already open', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 8 }), (r, more) => {
        const bigger = new Set(clearingPixels(r + more).map(key));
        return clearingPixels(r).every((p) => bigger.has(key(p)));
      }),
    );
  });

  it('is the same clearing every time', () => {
    expect(clearingPixels(13)).toEqual(clearingPixels(13));
    expect(clearingPixels(0)).toEqual([]);
  });
});
