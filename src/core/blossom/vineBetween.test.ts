import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { searchWithFlowers } from '../edmonds/search';
import { neighbors } from '../graph/queries';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { contract, openLayer } from './contract';
import { vineBetween, vinesFrom } from './vineBetween';

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

describe('every vine leaving a folded node at once', () => {
  it('names, for each neighbor, the same vine as asking for it alone', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        // The garden a search ends in holds the folds it made, nested ones included.
        const { layer: folded } = searchWithFlowers(graph, matching);
        for (let a = 0; a < folded.nodes.length; a++) {
          const vines = vinesFrom(folded, a);
          expect([...vines.keys()].sort((x, y) => x - y)).toEqual(neighbors(folded.graph, a));
          for (const b of neighbors(folded.graph, a)) {
            expect(vines.get(b)).toEqual(vineBetween(folded, a, b));
          }
        }
      }),
    );
  });

  it('a shared lantern still joins the two base sprouts', () => {
    expect(vinesFrom(layer, 2).get(1)).toEqual([2, 1]);
    expect(vinesFrom(layer, 2).get(3)).toEqual([3, 7]);
  });
});
