import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { boxesOverlap, distanceToPoint, distanceToSegment, type Rect } from './boxDistance';

const box: Rect = { x: 10, y: 20, width: 30, height: 10 };

describe('distances from a box', () => {
  it('measures a point from the nearest edge, or 0 inside', () => {
    expect(distanceToPoint(box, { x: 20, y: 25 })).toBe(0);
    expect(distanceToPoint(box, { x: 0, y: 25 })).toBe(10);
    expect(distanceToPoint(box, { x: 20, y: 34 })).toBe(4);
    // Off a corner: straight to the corner.
    expect(distanceToPoint(box, { x: 43, y: 34 })).toBe(5);
  });

  it('measures a segment from its nearest point, 0 when it crosses the box', () => {
    // Through the box from side to side, both ends far outside.
    expect(distanceToSegment(box, { x: -100, y: 25 }, { x: 200, y: 25 })).toBe(0);
    // Diagonally through it.
    expect(distanceToSegment(box, { x: 0, y: 0 }, { x: 60, y: 60 })).toBe(0);
    // Passing above it.
    expect(distanceToSegment(box, { x: 0, y: 12 }, { x: 60, y: 12 })).toBe(8);
    // Ending short of it.
    expect(distanceToSegment(box, { x: 0, y: 25 }, { x: 4, y: 25 })).toBe(6);
    // A corner nearest to the middle of the segment.
    expect(distanceToSegment(box, { x: 44, y: 18 }, { x: 40, y: 14 })).toBeCloseTo(Math.SQRT2 * 3);
    // A segment of one point is that point.
    expect(distanceToSegment(box, { x: 0, y: 25 }, { x: 0, y: 25 })).toBe(10);
  });

  it('never measures a segment farther than its sampled points', () => {
    const point = fc.record({
      x: fc.integer({ min: -50, max: 100 }),
      y: fc.integer({ min: -50, max: 100 }),
    });
    fc.assert(
      fc.property(point, point, (a, b) => {
        const exact = distanceToSegment(box, a, b);
        for (let k = 0; k <= 50; k++) {
          const t = k / 50;
          const sample = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          expect(exact).toBeLessThanOrEqual(distanceToPoint(box, sample) + 1e-9);
        }
        // And it is reached: no sampled point is much farther than the step allows.
        const step = Math.hypot(b.x - a.x, b.y - a.y) / 50;
        const nearest = Math.min(
          ...Array.from({ length: 51 }, (_, k) =>
            distanceToPoint(box, {
              x: a.x + ((b.x - a.x) * k) / 50,
              y: a.y + ((b.y - a.y) * k) / 50,
            }),
          ),
        );
        expect(nearest).toBeLessThanOrEqual(exact + step);
      }),
    );
  });

  it('tells two boxes overlap, with a gap kept between them', () => {
    const right: Rect = { x: 42, y: 20, width: 5, height: 5 };
    expect(boxesOverlap(box, right, 0)).toBe(false);
    expect(boxesOverlap(box, right, 2)).toBe(false);
    expect(boxesOverlap(box, right, 3)).toBe(true);
    expect(boxesOverlap(box, { x: 15, y: 22, width: 2, height: 2 }, 0)).toBe(true);
    expect(boxesOverlap(box, { x: 10, y: 30, width: 4, height: 4 }, 0)).toBe(false);
  });
});
