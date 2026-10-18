import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  boxesNear,
  boxNearCircle,
  boxNearDiamond,
  segmentNearBox,
  segmentsCross,
  type Box,
} from './plane';

const p = (x: number, y: number) => ({ x, y });
const box = (left: number, top: number, right: number, bottom: number): Box => ({
  left,
  top,
  right,
  bottom,
});

describe('segmentsCross', () => {
  it('sees two segments that cut each other', () => {
    expect(segmentsCross(p(0, 0), p(10, 10), p(0, 10), p(10, 0))).toBe(true);
  });

  it('sees one segment end on the middle of another', () => {
    expect(segmentsCross(p(0, 0), p(10, 0), p(5, 0), p(5, 8))).toBe(true);
  });

  it('leaves apart segments that do not meet, parallel or not', () => {
    expect(segmentsCross(p(0, 0), p(10, 0), p(0, 5), p(10, 5))).toBe(false);
    expect(segmentsCross(p(0, 0), p(10, 0), p(11, -5), p(11, 5))).toBe(false);
    expect(segmentsCross(p(0, 0), p(4, 0), p(6, 0), p(10, 0))).toBe(false);
  });

  it('lets two segments share an end, as two vines of one sprout do', () => {
    expect(segmentsCross(p(0, 0), p(10, 0), p(0, 0), p(0, 10))).toBe(false);
    expect(segmentsCross(p(0, 0), p(10, 0), p(10, 0), p(20, 0))).toBe(false);
  });

  it('sees two segments of one end that lie along each other', () => {
    expect(segmentsCross(p(0, 0), p(10, 0), p(0, 0), p(5, 0))).toBe(true);
    expect(segmentsCross(p(0, 0), p(10, 10), p(20, 20), p(0, 0))).toBe(true);
  });

  it('sees segments of the same line that overlap', () => {
    expect(segmentsCross(p(0, 0), p(10, 0), p(5, 0), p(15, 0))).toBe(true);
  });

  it('does not depend on the order of the segments or of their ends', () => {
    const point = fc.record({
      x: fc.integer({ min: 0, max: 8 }),
      y: fc.integer({ min: 0, max: 8 }),
    });
    fc.assert(
      fc.property(point, point, point, point, (a, b, c, d) => {
        const once = segmentsCross(a, b, c, d);
        expect(segmentsCross(c, d, a, b)).toBe(once);
        expect(segmentsCross(b, a, d, c)).toBe(once);
      }),
    );
  });
});

describe('boxesNear', () => {
  it('sees boxes that overlap, or keep less than the clearance between them', () => {
    expect(boxesNear(box(0, 0, 10, 10), box(5, 5, 15, 15), 0)).toBe(true);
    expect(boxesNear(box(0, 0, 10, 10), box(10, 0, 20, 10), 1)).toBe(true);
  });

  it('leaves apart boxes that only touch, or keep the clearance', () => {
    expect(boxesNear(box(0, 0, 10, 10), box(10, 0, 20, 10), 0)).toBe(false);
    expect(boxesNear(box(0, 0, 10, 10), box(11, 0, 20, 10), 1)).toBe(false);
    expect(boxesNear(box(0, 0, 10, 10), box(0, 12, 10, 20), 1)).toBe(false);
  });
});

describe('boxNearCircle', () => {
  it('sees a circle that reaches into the box or its clearance', () => {
    expect(boxNearCircle(box(0, 0, 10, 10), p(5, 5), 2, 0)).toBe(true);
    expect(boxNearCircle(box(0, 0, 10, 10), p(15, 5), 5, 1)).toBe(true);
  });

  it('leaves apart a circle beyond the clearance, corners included', () => {
    expect(boxNearCircle(box(0, 0, 10, 10), p(16, 5), 5, 1)).toBe(false);
    // The corner (10, 10) is 5√2 ≈ 7.07 away from (15, 15).
    expect(boxNearCircle(box(0, 0, 10, 10), p(15, 15), 6, 1)).toBe(false);
  });
});

describe('boxNearDiamond', () => {
  it('sees a corner of the diamond that reaches into the box or its clearance', () => {
    expect(boxNearDiamond(box(0, 0, 10, 10), p(19, 5), 9.5, 0)).toBe(true);
    expect(boxNearDiamond(box(0, 0, 10, 10), p(20, 5), 9.5, 1)).toBe(true);
    expect(boxNearDiamond(box(0, 0, 10, 10), p(21, 5), 9.5, 1)).toBe(false);
  });

  it('leaves apart a box off the slanted side, where a circle would reach it', () => {
    // The corner (10, 10) is 12 away from (16, 16) along the axes, but only 8.5 in a straight line.
    expect(boxNearDiamond(box(0, 0, 10, 10), p(16, 16), 9.5, 1)).toBe(false);
    expect(boxNearCircle(box(0, 0, 10, 10), p(16, 16), 9.5, 1)).toBe(true);
  });
});

describe('segmentNearBox', () => {
  it('sees a segment that runs through the box, even with both ends outside it', () => {
    expect(segmentNearBox(p(-5, 5), p(15, 5), box(0, 0, 10, 10), 0)).toBe(true);
    expect(segmentNearBox(p(5, -20), p(5, 30), box(0, 0, 10, 10), 0)).toBe(true);
    expect(segmentNearBox(p(-5, 15), p(15, -5), box(0, 0, 10, 10), 0)).toBe(true);
  });

  it('sees a segment with an end inside the box', () => {
    expect(segmentNearBox(p(5, 5), p(50, 50), box(0, 0, 10, 10), 0)).toBe(true);
  });

  it('sees a segment that passes closer than the reach, and leaves one at the reach', () => {
    expect(segmentNearBox(p(-5, 11.5), p(15, 11.5), box(0, 0, 10, 10), 2)).toBe(true);
    expect(segmentNearBox(p(-5, 12), p(15, 12), box(0, 0, 10, 10), 2)).toBe(false);
  });

  it('measures past a corner in a straight line, not along the axes', () => {
    // The segment x + y = 23 passes 3/√2 ≈ 2.12 from the corner (10, 10).
    expect(segmentNearBox(p(23, 0), p(0, 23), box(0, 0, 10, 10), 2)).toBe(false);
    expect(segmentNearBox(p(23, 0), p(0, 23), box(0, 0, 10, 10), 2.2)).toBe(true);
  });

  it('counts a segment exactly as far as the reach from a corner as not near', () => {
    // (35, -30) to (-29, 18) passes exactly 3 from the corner (0, 0).
    expect(segmentNearBox(p(35, -30), p(-29, 18), box(0, 0, 10, 10), 3)).toBe(false);
  });

  it('measures from the end of a segment that stops short of the box', () => {
    expect(segmentNearBox(p(30, 5), p(11, 5), box(0, 0, 10, 10), 2)).toBe(true);
    expect(segmentNearBox(p(30, 5), p(12, 5), box(0, 0, 10, 10), 2)).toBe(false);
  });

  it('agrees with a fine walk along the segment', () => {
    const coordinate = fc.integer({ min: -30, max: 40 });
    fc.assert(
      fc.property(coordinate, coordinate, coordinate, coordinate, (ax, ay, bx, by) => {
        const target = box(0, 0, 10, 10);
        // The distance from the box of points every 1/400 of the way, an upper bound close to it.
        let walked = Infinity;
        for (let i = 0; i <= 400; i++) {
          const [x, y] = [ax + ((bx - ax) * i) / 400, ay + ((by - ay) * i) / 400];
          const dx = Math.max(target.left - x, 0, x - target.right);
          const dy = Math.max(target.top - y, 0, y - target.bottom);
          walked = Math.min(walked, Math.hypot(dx, dy));
        }
        const step = Math.hypot(bx - ax, by - ay) / 400;
        if (walked > 3 + step) expect(segmentNearBox(p(ax, ay), p(bx, by), target, 3)).toBe(false);
        // A segment exactly `reach` from a corner is not near; the walk's rounding may put it a
        // hair under, so only a clear margin under counts.
        if (walked < 3 - 1e-9) expect(segmentNearBox(p(ax, ay), p(bx, by), target, 3)).toBe(true);
      }),
    );
  });
});
