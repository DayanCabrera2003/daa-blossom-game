import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { contract, openLayer } from './contract';
import { vineBetween } from './vineBetween';

// Level 4.6 folded: R a F e = 0 1 2 3, with F = {b, c, d, f, g} (original 2..6) and e = 7.
const petals = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 2],
    [3, 7],
  ]),
);
const lanterns = unwrap(
  createMatching(petals, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);
const { layer } = contract(openLayer(petals, lanterns), [2, 3, 4, 5, 6]);

describe('the vine between two folded nodes', () => {
  it('a shared lantern joins the two base sprouts', () => {
    expect(vineBetween(layer, 1, 2)).toEqual([1, 2]);
    expect(vineBetween(layer, 2, 1)).toEqual([2, 1]);
  });

  it('a dark vine lands on whichever petal it touches, oriented from the first node', () => {
    expect(vineBetween(layer, 2, 3)).toEqual([3, 7]);
    expect(vineBetween(layer, 3, 2)).toEqual([7, 3]);
  });

  it('asking for a vine between nodes that are not neighbors is a bug', () => {
    expect(() => vineBetween(layer, 0, 3)).toThrow();
  });
});
