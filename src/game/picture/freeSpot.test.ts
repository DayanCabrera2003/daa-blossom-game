import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { boxesOverlap, type Rect } from './boxDistance';
import { freeSpot } from './freeSpot';

const REGION: Rect = { x: 10, y: 100, width: 100, height: 20 };

/** Whether `inner` lies wholly inside `outer`. */
const inside = (inner: Rect, outer: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height;

describe('a free spot in a region of the hub', () => {
  it('takes the spot nearest the wished x, as low in the region as it goes', () => {
    expect(freeSpot({ width: 16, height: 16 }, REGION, 50, [])).toEqual({
      x: 50,
      y: 104,
      width: 16,
      height: 16,
    });
    // Never out of the region, however far the wish.
    expect(freeSpot({ width: 16, height: 16 }, REGION, 500, [])?.x).toBe(94);
    expect(freeSpot({ width: 16, height: 16 }, REGION, -50, [])?.x).toBe(10);
  });

  it('steps aside from what is taken, keeping a pixel clear of it', () => {
    const taken: Rect = { x: 40, y: 100, width: 30, height: 20 };
    const spot = freeSpot({ width: 16, height: 16 }, REGION, 50, [taken]);
    expect(spot).not.toBeNull();
    if (spot === null) return;
    expect(boxesOverlap(spot, taken, 1)).toBe(false);
    // The nearest side: right of the box is 21 px from the wish, left of it 27.
    expect(spot.x).toBe(71);
  });

  it('finds nothing when the region is full or too small', () => {
    expect(freeSpot({ width: 16, height: 16 }, REGION, 50, [REGION])).toBeNull();
    expect(freeSpot({ width: 16, height: 30 }, REGION, 50, [])).toBeNull();
  });

  it('always gives a spot inside the region and clear of every taken box', () => {
    const box = fc.record({
      x: fc.integer({ min: 0, max: 120 }),
      y: fc.integer({ min: 90, max: 125 }),
      width: fc.integer({ min: 1, max: 40 }),
      height: fc.integer({ min: 1, max: 20 }),
    });
    fc.assert(
      fc.property(
        fc.array(box, { maxLength: 5 }),
        fc.integer({ min: -20, max: 140 }),
        (taken, x) => {
          const spot = freeSpot({ width: 12, height: 10 }, REGION, x, taken);
          if (spot === null) return;
          expect(inside(spot, REGION)).toBe(true);
          for (const other of taken) expect(boxesOverlap(spot, other, 1)).toBe(false);
        },
      ),
    );
  });
});
