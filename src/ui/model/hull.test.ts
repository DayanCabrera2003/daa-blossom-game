import { describe, expect, it } from 'vitest';
import { convexHull, roundedHull } from './hull';

describe('convexHull', () => {
  it('keeps the corners of a square and drops the point inside, in turning order', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ];
    expect(convexHull(square)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
  });

  it('keeps one or two points as they are, and drops repeats and points on an edge', () => {
    expect(convexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
    expect(
      convexHull([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]);
  });
});

describe('roundedHull', () => {
  it('goes round every point at least `pad` away, and stays close to them', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 10, y: 15 },
    ];
    const outline = roundedHull(points, 6);
    expect(outline.length).toBeGreaterThan(6);
    for (const corner of outline) {
      const nearest = Math.min(...points.map((p) => Math.hypot(p.x - corner.x, p.y - corner.y)));
      expect(nearest).toBeCloseTo(6);
    }
  });

  it('rings a single point', () => {
    const outline = roundedHull([{ x: 5, y: 5 }], 3);
    expect(outline).toHaveLength(16);
  });
});
