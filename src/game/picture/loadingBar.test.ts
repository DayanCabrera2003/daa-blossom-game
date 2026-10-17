import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { loadingBar } from './loadingBar';

describe('loadingBar', () => {
  it('sits centred on the logical canvas', () => {
    const { frame } = loadingBar(0);
    expect(frame.x * 2 + frame.width).toBe(CANVAS_WIDTH);
    expect(frame.y * 2 + frame.height).toBe(CANVAS_HEIGHT);
  });

  it('is empty before anything loads and full once everything has', () => {
    expect(loadingBar(0).fill.width).toBe(0);
    const full = loadingBar(1);
    expect(full.fill.width).toBe(full.frame.width - 2);
  });

  it('fills inside its frame, a pixel in from each edge', () => {
    const { frame, fill } = loadingBar(0.5);
    expect(fill.x).toBe(frame.x + 1);
    expect(fill.y).toBe(frame.y + 1);
    expect(fill.height).toBe(frame.height - 2);
  });

  it('grows in whole pixels with the progress and never leaves its frame', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1, max: 2, noNaN: true }),
        fc.double({ min: 0, max: 1 }),
        (a, b) => {
          const lower = loadingBar(Math.min(a, b)).fill.width;
          const upper = loadingBar(Math.max(a, b)).fill.width;
          expect(Number.isInteger(lower)).toBe(true);
          expect(lower).toBeLessThanOrEqual(upper);
          expect(lower).toBeGreaterThanOrEqual(0);
          expect(upper).toBeLessThanOrEqual(loadingBar(1).fill.width);
        },
      ),
    );
  });
});
