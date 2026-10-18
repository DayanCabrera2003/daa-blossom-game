import { describe, expect, it } from 'vitest';
import type { Point } from '../input/target';
import type { FlowerPicture } from './garden';
import {
  FLOWER_HEART,
  FLOWER_REACH,
  flowerLooks,
  foldPetals,
  INNER_REACH,
  petalRing,
} from './petals';

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** A folded flower as the garden's picture gives it; its outline does not matter here. */
const flower = (id: number, depth: number, petals: number, centre: Point): FlowerPicture => ({
  id,
  depth,
  outline: [],
  petals,
  centre,
});

describe('the petals of a folded flower', () => {
  const centre = { x: 100, y: 80 };

  it.each([3, 5, 7])('a flower of %i sprouts has as many petals, evenly round', (k) => {
    const petals = petalRing(centre, k, FLOWER_REACH, FLOWER_HEART);
    expect(petals).toHaveLength(k);
    const step = (2 * Math.PI) / k;
    petals.forEach((petal, i) => expect(petal.angle).toBeCloseTo(-Math.PI / 2 + i * step));
  });

  it('points its first petal up and keeps every petal inside its 32 × 32 square', () => {
    const petals = petalRing(centre, 5, FLOWER_REACH, FLOWER_HEART);
    expect(petals[0]?.tip.x).toBeCloseTo(centre.x);
    expect(petals[0]?.tip.y).toBeCloseTo(centre.y - FLOWER_REACH);
    expect(FLOWER_REACH).toBeLessThanOrEqual(16);
    for (const petal of petals) {
      expect(petal.outline.length).toBeGreaterThanOrEqual(6);
      for (const p of petal.outline) expect(distance(p, centre)).toBeLessThanOrEqual(16 + 1e-9);
    }
  });

  it('gives each petal a shape that does not overlap its neighbours much', () => {
    // The widest point of a petal stays within its share of the circle.
    for (const k of [3, 5, 7, 9]) {
      const petals = petalRing(centre, k, FLOWER_REACH, FLOWER_HEART);
      const [first, second] = petals;
      expect(distance(first?.middle ?? centre, second?.middle ?? centre)).toBeGreaterThan(
        first?.width ?? Infinity,
      );
    }
  });

  it('draws only the flowers on top, each with the first flower nested in it smaller in its middle', () => {
    const looks = flowerLooks([
      flower(1, 0, 5, centre),
      flower(0, 1, 3, { x: 90, y: 70 }),
      flower(2, 0, 3, { x: 300, y: 100 }),
    ]);
    expect(looks.map((look) => look.id)).toEqual([1, 2]);
    const [nested, plain] = looks;
    expect(nested?.petals).toHaveLength(5);
    expect(nested?.inner).toHaveLength(3);
    for (const petal of nested?.inner ?? [])
      expect(distance(petal.tip, centre)).toBeCloseTo(INNER_REACH);
    expect(INNER_REACH).toBeLessThan(FLOWER_REACH / 2);
    expect(plain?.inner).toBeNull();
  });

  it('does not take a flower further down for the one nested in a flower on top', () => {
    // The flower at depth 2 is inside the one at depth 1, not directly in the one on top.
    const looks = flowerLooks([
      flower(2, 0, 3, centre),
      flower(1, 1, 5, centre),
      flower(0, 2, 7, centre),
    ]);
    expect(looks[0]?.inner).toHaveLength(5);
  });

  it('stops looking for a nested flower at the next flower on top', () => {
    const looks = flowerLooks([flower(0, 0, 3, centre), flower(1, 0, 3, centre)]);
    expect(looks.map((look) => look.inner)).toEqual([null, null]);
  });
});

describe('the petals of a flower folding or opening (GDD §4.1, key animation 2)', () => {
  const middle: Point = { x: 100, y: 100 };

  it.each([3, 5, 7])(
    'a flower of %i petals folds at the size the garden then draws it, never wider',
    (k) => {
      const folding = foldPetals({ centre: middle, petals: k, inner: null });
      const [drawn] = flowerLooks([flower(0, 0, k, middle)]);
      expect(folding.petals).toEqual(drawn?.petals);
      expect(folding.inner).toBeNull();
      for (const petal of folding.petals)
        expect(distance(petal.tip, middle)).toBeCloseTo(FLOWER_REACH);
    },
  );

  it('a flower folding over one nested in it shows that one small in its middle, as drawn', () => {
    const folding = foldPetals({ centre: middle, petals: 5, inner: 3 });
    const [drawn] = flowerLooks([flower(1, 0, 5, middle), flower(0, 1, 3, middle)]);
    expect(folding.petals).toEqual(drawn?.petals);
    expect(folding.inner).toEqual(drawn?.inner);
    for (const petal of folding.inner ?? [])
      expect(distance(petal.tip, middle)).toBeCloseTo(INNER_REACH);
  });
});
