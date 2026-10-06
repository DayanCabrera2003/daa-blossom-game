import { describe, expect, it } from 'vitest';
import { baseVertex, members } from './hierarchy';
import type { Blossom, GardenNode } from './types';

const sprout = (vertex: number): GardenNode => ({ kind: 'sprout', vertex });

// Level 5.1: R a b c d g h t = 0 1 2 3 4 5 6 7.
// F1 = triangle b–c=d–b with base b; F2 = R–a=F1–g=h–R with base R.
const f1: Blossom = {
  kind: 'blossom',
  id: 0,
  cycle: [sprout(2), sprout(3), sprout(4)],
  edges: [
    [2, 3],
    [3, 4],
    [4, 2],
  ],
};
const f2: Blossom = {
  kind: 'blossom',
  id: 1,
  cycle: [sprout(0), sprout(1), f1, sprout(5), sprout(6)],
  edges: [
    [0, 1],
    [1, 2],
    [3, 5],
    [5, 6],
    [6, 0],
  ],
};

describe('blossom hierarchy', () => {
  it('a sprout contains itself and is its own base', () => {
    expect(members(sprout(7))).toEqual([7]);
    expect(baseVertex(sprout(7))).toBe(7);
  });

  it('a flower contains every sprout of every flower inside it, in ascending order', () => {
    expect(members(f1)).toEqual([2, 3, 4]);
    expect(members(f2)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('the base sprout of a flower is the base of its base, all the way down', () => {
    expect(baseVertex(f1)).toBe(2);
    expect(baseVertex(f2)).toBe(0);
    const outer: Blossom = { ...f2, cycle: [f1, ...f2.cycle.slice(1)] };
    expect(baseVertex(outer)).toBe(2);
  });
});
