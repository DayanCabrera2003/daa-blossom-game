import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { convexHull, flowerOutline, insidePolygon, interiorCandidates } from './flowerShape';

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe('flower outlines', () => {
  it('the hull of a square and its centre is the square', () => {
    const hull = convexHull([...square, { x: 5, y: 5 }]);
    expect(hull).toHaveLength(4);
    expect(hull).toEqual(expect.arrayContaining(square));
  });

  it('the outline of a flower surrounds its petals with a margin', () => {
    const outline = flowerOutline(square, 4);
    for (const petal of square) expect(insidePolygon(petal, outline)).toBe(true);
    expect(insidePolygon({ x: -2, y: -2 }, outline)).toBe(true);
    expect(insidePolygon({ x: -9, y: 5 }, outline)).toBe(false);
  });

  it('petals in a straight line still get a round outline around them', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    const outline = flowerOutline(line, 4);
    expect(outline.length).toBeGreaterThanOrEqual(8);
    for (const petal of line) expect(insidePolygon(petal, outline)).toBe(true);
  });

  it('a point well outside is outside', () => {
    expect(insidePolygon({ x: 50, y: 50 }, square)).toBe(false);
  });

  it('offers interior points to touch, starting with the centre', () => {
    const candidates = interiorCandidates(square);
    expect(candidates[0]).toEqual({ x: 5, y: 5 });
    for (const point of candidates) expect(insidePolygon(point, square)).toBe(true);
  });

  it('property: every petal is inside its flower outline', () => {
    const point = fc.record({
      x: fc.integer({ min: 0, max: 479 }),
      y: fc.integer({ min: 0, max: 269 }),
    });
    fc.assert(
      fc.property(fc.array(point, { minLength: 3, maxLength: 9 }), (petals) => {
        const outline = flowerOutline(petals, 6);
        for (const petal of petals) expect(insidePolygon(petal, outline)).toBe(true);
      }),
    );
  });

  it('the hull of fewer than three points is just those points, sorted', () => {
    expect(
      convexHull([
        { x: 5, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toEqual([
      { x: 1, y: 2 },
      { x: 5, y: 1 },
    ]);
  });
});
