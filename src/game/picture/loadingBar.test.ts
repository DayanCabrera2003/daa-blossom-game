import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { PALETTE } from '../view/palette';
import { LOADING_TONES, loadingBar } from './loadingBar';

describe('loadingBar', () => {
  it('sits centred on the logical canvas', () => {
    const { frame } = loadingBar(0);
    expect(frame.x * 2 + frame.width).toBe(CANVAS_WIDTH);
    expect(frame.y * 2 + frame.height).toBe(CANVAS_HEIGHT);
  });

  it("is drawn in the tones of the page's lantern, which stands where it appears", () => {
    // The lantern of index.html (tests/pageHead.test.ts) is centred on the window, as the canvas
    // is, and drawn in these colours: the bar takes over from it with no jump in place or tone.
    expect(LOADING_TONES).toEqual({ edge: 'panelEdge', fill: 'lit', empty: 'background' });
    for (const tone of Object.values(LOADING_TONES)) expect(PALETTE[tone]).toBeTypeOf('number');
  });

  it('is empty before anything loads and full once everything has', () => {
    expect(loadingBar(0).fill.width).toBe(0);
    const full = loadingBar(1);
    expect(full.fill.width).toBe(full.frame.width - 2);
  });

  it('stays empty when the progress is not a number', () => {
    expect(loadingBar(Number.NaN).fill.width).toBe(0);
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
