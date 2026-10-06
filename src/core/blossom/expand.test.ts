import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import { unwrap } from '../shared/result';
import { bipartiteSearch, type SearchOutcome } from '../search/bipartiteSearch';
import { contract, openLayer } from './contract';
import { findOddCycle } from './detect';
import { expandPath } from './expand';
import type { Layer } from './types';

const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

/** Searches, folding every flower it runs into, until a search ends cleanly. */
const foldAndSearch = (
  graph: Graph,
  matching: Matching,
): { layer: Layer; outcome: SearchOutcome } => {
  let layer = openLayer(graph, matching);
  for (;;) {
    const result = bipartiteSearch(layer.graph, layer.matching);
    if (result.ok) return { layer, outcome: result.value };
    const { forest, from, to } = result.error;
    layer = contract(layer, findOddCycle(forest, from, to)).layer;
  }
};

// Level 5.1: R a b c d g h t = 0 1 2 3 4 5 6 7.
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
const wildLanterns = unwrap(
  createMatching(wild, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

describe('unfolding nested flowers', () => {
  it('opens the five petals of level 4.6 straight to the original garden', () => {
    // R–a=b, cycle b–c=d–f=g–b, exit c–e. R a b c d f g e = 0 1 2 3 4 5 6 7.
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
    expect(expandPath(layer, [0, 1, 2, 3])).toEqual([0, 1, 2, 6, 5, 4, 3, 7]);
  });

  it('opens F2 and then F1 inside it, from the outside in (level 5.1)', () => {
    const first = contract(openLayer(wild, wildLanterns), [2, 3, 4]).layer;
    const { layer } = contract(first, [0, 1, 2, 3, 4]);
    // t–a=b–d=c–g=h–R: inside F1 the short side b–c would put two dark vines in a row.
    expect(expandPath(layer, [1, 0])).toEqual([7, 1, 2, 4, 3, 5, 6, 0]);
    expect(expandPath(layer, [0, 1])).toEqual([0, 6, 5, 3, 4, 2, 1, 7]);
  });

  it('the open garden needs no unfolding', () => {
    expect(expandPath(openLayer(wild, wildLanterns), [7, 1])).toEqual([7, 1]);
  });

  it('a flower with no way out has no chain, folded or not (level 4.9)', () => {
    // R–a=b, triangle b–c=d–b: R a b c d = 0 1 2 3 4.
    const closed = unwrap(
      createGraph(5, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
      ]),
    );
    const lanterns = unwrap(
      createMatching(closed, [
        [1, 2],
        [3, 4],
      ]),
    );
    const { layer, outcome } = foldAndSearch(closed, lanterns);
    expect(layer.nodes.length).toBe(3);
    expect(outcome.kind).toBe('noPath');
    expect(optimum(closed)).toBe(2);
  });

  it('property: a chain of the folded garden unfolds to a chain of the original', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
        const { layer, outcome } = foldAndSearch(graph, matching);
        if (outcome.kind !== 'augmentingPath') return;
        const path = expandPath(layer, outcome.path);
        expect(checkAugmentingPath(graph, matching, path).ok).toBe(true);
      }),
    );
  });

  it('property (C8): no chain in the folded garden means none in the original', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, matching]) => {
        const { outcome } = foldAndSearch(graph, matching);
        if (outcome.kind === 'noPath') expect(size(matching)).toBe(optimum(graph));
      }),
    );
  });
});
