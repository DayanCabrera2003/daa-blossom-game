import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { driftApart, PIECE_GAP, type Box } from './pondLayout';

const AREA: Box = { x0: 8, y0: 28, x1: 472, y1: 226 };

/** A box moved by an offset. */
const moved = (box: Box, offset: { x: number; y: number }): Box => ({
  x0: box.x0 + offset.x,
  x1: box.x1 + offset.x,
  y0: box.y0 + offset.y,
  y1: box.y1 + offset.y,
});

/** Whether two boxes keep at least the gap between them on some axis. */
const apart = (a: Box, b: Box): boolean =>
  a.x1 + PIECE_GAP <= b.x0 ||
  b.x1 + PIECE_GAP <= a.x0 ||
  a.y1 + PIECE_GAP <= b.y0 ||
  b.y1 + PIECE_GAP <= a.y0;

const inside = (box: Box): boolean =>
  box.x0 >= AREA.x0 && box.x1 <= AREA.x1 && box.y0 >= AREA.y0 && box.y1 <= AREA.y1;

describe('the pieces of the tangle drifting apart', () => {
  it('nothing to move without pieces; a lone piece stays where it is', () => {
    expect(driftApart([], AREA)).toEqual([]);
    expect(driftApart([{ x0: 100, y0: 100, x1: 200, y1: 120 }], AREA)).toEqual([{ x: 0, y: 0 }]);
  });

  it('two pieces side by side move away from each other, along the row', () => {
    const left = { x0: 100, y0: 100, x1: 160, y1: 120 };
    const right = { x0: 200, y0: 100, x1: 260, y1: 120 };
    const [a, b] = driftApart([right, left], AREA);
    expect(b?.x).toBeLessThan(0);
    expect(a?.x).toBeGreaterThan(0);
    expect([a?.y, b?.y]).toEqual([0, 0]);
  });

  it('pieces stacked in a column too wide for a row drift apart vertically, inside the garden', () => {
    const top = { x0: 20, y0: 40, x1: 400, y1: 80 };
    const bottom = { x0: 40, y0: 90, x1: 420, y1: 130 };
    const offsets = driftApart([top, bottom], AREA);
    expect(offsets.map((offset) => offset.x)).toEqual([0, 0]);
    const [a, b] = offsets.map((offset, i) => moved([top, bottom][i] as Box, offset));
    expect(apart(a as Box, b as Box)).toBe(true);
    expect(inside(a as Box) && inside(b as Box)).toBe(true);
  });

  it('a row pushed past the edge of the garden is brought back inside', () => {
    const boxes = [
      { x0: 300, y0: 100, x1: 380, y1: 120 },
      { x0: 390, y0: 100, x1: 470, y1: 120 },
    ];
    const shifted = driftApart(boxes, AREA).map((offset, i) => moved(boxes[i] as Box, offset));
    expect(shifted.every(inside)).toBe(true);
    expect(apart(shifted[0] as Box, shifted[1] as Box)).toBe(true);
  });

  it('pieces too big to fit apart either way still end apart, along the row', () => {
    const boxes = [
      { x0: 8, y0: 28, x1: 300, y1: 200 },
      { x0: 100, y0: 50, x1: 472, y1: 226 },
    ];
    const shifted = driftApart(boxes, AREA).map((offset, i) => moved(boxes[i] as Box, offset));
    expect(apart(shifted[0] as Box, shifted[1] as Box)).toBe(true);
    expect(shifted[0]?.x0).toBe(AREA.x0);
  });

  it('a line that only fits without the extra drift is laid out tight instead of overflowing', () => {
    // Found by exploration: with the drift the row is one pixel too long, and so is the column.
    const corner = { x0: 8, y0: 28, x1: 8, y1: 28 };
    const boxes = [corner, corner, { x0: 363, y0: 169, x1: 441, y1: 195 }];
    const shifted = driftApart(boxes, AREA).map((offset, i) => moved(boxes[i] as Box, offset));
    expect(shifted.every(inside)).toBe(true);
    shifted.forEach((a, i) => shifted.slice(i + 1).forEach((b) => expect(apart(a, b)).toBe(true)));
  });

  it('pieces that overflow even where they were are packed one after another', () => {
    // Found by exploration: three pieces start at the same x, so neither drifting nor staying fits.
    const boxes = [
      { x0: 237, y0: 82, x1: 302, y1: 113 },
      { x0: 237, y0: 82, x1: 312, y1: 115 },
      { x0: 8, y0: 82, x1: 8, y1: 115 },
      { x0: 237, y0: 28, x1: 285, y1: 28 },
    ];
    const shifted = driftApart(boxes, AREA).map((offset, i) => moved(boxes[i] as Box, offset));
    expect(shifted.every(inside)).toBe(true);
    shifted.forEach((a, i) => shifted.slice(i + 1).forEach((b) => expect(apart(a, b)).toBe(true)));
  });

  it('a few small pieces anywhere in the garden always end apart and inside it', () => {
    const box = fc
      .record({
        x: fc.integer({ min: AREA.x0, max: AREA.x1 - 80 }),
        y: fc.integer({ min: AREA.y0, max: AREA.y1 - 40 }),
        w: fc.integer({ min: 0, max: 80 }),
        h: fc.integer({ min: 0, max: 40 }),
      })
      .map(({ x, y, w, h }) => ({ x0: x, y0: y, x1: x + w, y1: y + h }));
    fc.assert(
      fc.property(fc.array(box, { maxLength: 4 }), (boxes) => {
        const shifted = driftApart(boxes, AREA).map((offset, i) => moved(boxes[i] as Box, offset));
        expect(shifted.every(inside)).toBe(true);
        shifted.forEach((a, i) =>
          shifted.slice(i + 1).forEach((b) => expect(apart(a, b)).toBe(true)),
        );
      }),
    );
  });
});
