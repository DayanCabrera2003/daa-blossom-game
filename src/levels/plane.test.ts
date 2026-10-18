import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { boxesNear, boxNearCircle, segmentsCross, type Box } from './plane';

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
