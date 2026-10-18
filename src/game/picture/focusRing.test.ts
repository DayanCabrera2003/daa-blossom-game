import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { FOCUS_RING, focusRing } from './focusRing';
import { PALETTE } from '../view/palette';

/** The pixels a ring's four sides cover, as "x,y". */
const pixelsOf = (lines: ReturnType<typeof focusRing>): Set<string> => {
  const pixels = new Set<string>();
  for (const line of lines) {
    for (let x = line.x; x < line.x + line.width; x += 1) {
      for (let y = line.y; y < line.y + line.height; y += 1) pixels.add(`${x},${y}`);
    }
  }
  return pixels;
};

describe('the ring round the thing in focus', () => {
  it('is a line of one pixel with one pixel of air round the box', () => {
    const lines = focusRing({ x: 100, y: 50, width: 30, height: 12 });
    const pixels = pixelsOf(lines);
    // The corners of the ring, two pixels out from the box.
    for (const corner of ['98,48', '131,48', '98,63', '131,63'])
      expect(pixels.has(corner)).toBe(true);
    // The air between the ring and the box stays clear.
    expect(pixels.has('99,49')).toBe(false);
    expect(pixels.has('130,62')).toBe(false);
    expect(pixels.size).toBe(2 * 34 + 2 * 14);
  });

  it('is drawn in the light of a lantern', () => {
    expect(FOCUS_RING.colour).toBe('lit');
    expect(PALETTE[FOCUS_RING.colour]).toBeTypeOf('number');
  });

  it('stays on the canvas and off the box, wherever the box is', () => {
    const box = fc
      .record({
        x: fc.integer({ min: 0, max: CANVAS_WIDTH - 1 }),
        y: fc.integer({ min: 0, max: CANVAS_HEIGHT - 1 }),
        width: fc.integer({ min: 1, max: 80 }),
        height: fc.integer({ min: 1, max: 30 }),
      })
      .filter((one) => one.x + one.width <= CANVAS_WIDTH && one.y + one.height <= CANVAS_HEIGHT);
    fc.assert(
      fc.property(box, (one) => {
        for (const line of focusRing(one)) {
          expect(line.x).toBeGreaterThanOrEqual(0);
          expect(line.y).toBeGreaterThanOrEqual(0);
          expect(line.x + line.width).toBeLessThanOrEqual(CANVAS_WIDTH);
          expect(line.y + line.height).toBeLessThanOrEqual(CANVAS_HEIGHT);
        }
        // Inside the box only its outermost pixels may be touched, where the canvas ends: a
        // button's label starts two pixels in, so no letter is ever covered.
        for (const pixel of pixelsOf(focusRing(one))) {
          const [x = 0, y = 0] = pixel.split(',').map(Number);
          const deep =
            x > one.x && x < one.x + one.width - 1 && y > one.y && y < one.y + one.height - 1;
          expect(deep).toBe(false);
        }
      }),
    );
  });
});
