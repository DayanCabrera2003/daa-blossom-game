import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import { validateMate } from '../matching/validate';
import { unwrap } from '../shared/result';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { contract, openLayer } from './contract';
import { findOddCycle } from './detect';
import { members } from './hierarchy';
import type { Layer } from './types';

const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

/** Checks that a folded garden is exactly the quotient of the original by its nodes. */
const expectQuotient = (layer: Layer): void => {
  const covered = layer.nodes.flatMap((node) => members(node)).sort((a, b) => a - b);
  expect(covered).toEqual([...Array(layer.original.n).keys()]);
  layer.nodes.forEach((node, id) => {
    for (const v of members(node)) expect(layer.nodeOf[v]).toBe(id);
  });
  const expected = new Set<string>();
  for (const [u, v] of layer.original.edges) {
    const [a, b] = [layer.nodeOf[u] as number, layer.nodeOf[v] as number];
    if (a !== b) expected.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
  }
  expect(layer.graph.edges.map(([a, b]) => `${a}-${b}`).sort()).toEqual([...expected].sort());
  expect(validateMate(layer.graph, layer.matching.mate).ok).toBe(true);
};

// Level 4.6: R–a=b, cycle b–c=d–f=g–b, exit c–e. R a b c d f g e = 0 1 2 3 4 5 6 7.
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
const petalLanterns = unwrap(
  createMatching(petals, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

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

describe('the open garden', () => {
  it('starts with every sprout as its own node', () => {
    const layer = openLayer(petals, petalLanterns);
    expect(layer.graph).toBe(petals);
    expect(layer.matching).toBe(petalLanterns);
    expect(layer.nodeOf).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(layer.nodes[3]).toEqual({ kind: 'sprout', vertex: 3 });
  });
});

describe('folding a flower', () => {
  it('folds the five petals of level 4.6 into one node in place of the base', () => {
    const { layer, blossom } = contract(openLayer(petals, petalLanterns), [2, 3, 4, 5, 6]);
    expect(blossom).toBe(2);
    expect(layer.nodeOf).toEqual([0, 1, 2, 2, 2, 2, 2, 3]);
    expect(layer.graph.edges).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
    // The flower keeps the lantern of its base: a=F; R and e stay in the dark.
    expect(layer.matching.mate).toEqual([-1, 2, 1, -1]);
    expect(layer.nodes[2]).toEqual({
      kind: 'blossom',
      id: 0,
      cycle: [2, 3, 4, 5, 6].map((vertex) => ({ kind: 'sprout', vertex })),
      edges: [
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 2],
      ],
    });
    expectQuotient(layer);
  });

  it('accepts the loop from any starting sprout', () => {
    const open = openLayer(petals, petalLanterns);
    expect(contract(open, [4, 5, 6, 2, 3])).toEqual(contract(open, [2, 3, 4, 5, 6]));
  });

  it('refuses a loop that is not a flower', () => {
    expect(() => contract(openLayer(petals, petalLanterns), [2, 3, 4, 5])).toThrow();
  });

  it('a folded flower can be a petal of a bigger one (level 5.1)', () => {
    const first = contract(openLayer(wild, wildLanterns), [2, 3, 4]);
    // R a F1 g h t = 0 1 2 3 4 5; F1 is reached from g through c–g.
    expect(first.layer.graph.edges).toEqual([
      [0, 1],
      [0, 4],
      [1, 2],
      [1, 5],
      [2, 3],
      [3, 4],
    ]);
    const second = contract(first.layer, [0, 1, 2, 3, 4]);
    expect(second.blossom).toBe(0);
    expect(second.layer.graph.edges).toEqual([[0, 1]]);
    expect(second.layer.matching.mate).toEqual([-1, -1]);
    const f2 = second.layer.nodes[0];
    expect(f2).toMatchObject({
      kind: 'blossom',
      id: 1,
      edges: [
        [0, 1],
        [1, 2],
        [3, 5],
        [5, 6],
        [6, 0],
      ],
    });
    if (f2?.kind === 'blossom') expect(f2.cycle[2]).toBe(first.layer.nodes[2]);
    expectQuotient(second.layer);
  });

  it('property (flower lemma, C8): folding keeps the number of missing lanterns', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, matching]) => {
        let layer = openLayer(graph, matching);
        // Fold every flower a search runs into, as long as searches keep running into them.
        for (;;) {
          const result = bipartiteSearch(layer.graph, layer.matching);
          if (result.ok) return;
          const { forest, from, to } = result.error;
          const loop = findOddCycle(forest, from, to);
          const folded = contract(layer, loop).layer;
          expectQuotient(folded);
          expect(size(folded.matching)).toBe(size(layer.matching) - (loop.length - 1) / 2);
          expect(optimum(folded.graph) - size(folded.matching)).toBe(
            optimum(layer.graph) - size(layer.matching),
          );
          layer = folded;
        }
      }),
    );
  });
});
