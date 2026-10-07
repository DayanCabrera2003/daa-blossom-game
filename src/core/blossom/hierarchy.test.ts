import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { contract, openLayer } from './contract';
import { baseVertex, members, nestingDepth, nodesWithin, outermostNode } from './hierarchy';
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

describe('layers of a folded garden', () => {
  // Level 5.1 folded twice: F1 = {b, c, d} inside F2 = {R, a, F1, g, h}; t stays outside.
  const wild = unwrap(
    createGraph(8, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 4],
      [3, 5],
      [5, 6],
      [0, 6],
      [1, 7],
    ]),
  );
  const lanterns = unwrap(
    createMatching(wild, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
  );
  const first = contract(openLayer(wild, lanterns), [2, 3, 4]).layer;
  const second = contract(first, [0, 1, 2, 3, 4]).layer;

  it('a sprout lives in the outermost flower that contains it', () => {
    expect(outermostNode(second, 3)).toBe(second.nodes[0]);
    expect(outermostNode(first, 3)).toBe(first.nodes[2]);
    expect(outermostNode(second, 7)).toEqual({ kind: 'sprout', vertex: 7 });
  });

  it('counts how many flowers wrap a sprout (zoom levels of the Layers view)', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((v) => nestingDepth(second, v))).toEqual([
      1, 1, 2, 2, 2, 1, 1, 0,
    ]);
    expect(nestingDepth(openLayer(wild, lanterns), 3)).toBe(0);
  });

  it('sees what entered flowers fold, from the outside in (the Layers view, 5.2)', () => {
    expect(nodesWithin(second, [])).toBe(second.nodes);
    expect(nodesWithin(second, [1])).toBe((second.nodes[0] as Blossom).cycle);
    expect(nodesWithin(second, [1, 0])).toEqual([sprout(2), sprout(3), sprout(4)]);
    // A nested flower is not entered from outside, nor a flower that is not folded.
    expect(nodesWithin(second, [0])).toBeNull();
    expect(nodesWithin(second, [1, 0, 0])).toBeNull();
    expect(nodesWithin(first, [1])).toBeNull();
  });
});
