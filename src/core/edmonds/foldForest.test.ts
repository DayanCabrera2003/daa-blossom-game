import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { expectForestInvariants } from '../../../tests/support/forestInvariants';
import { contract, openLayer } from '../blossom/contract';
import { findOddCycle } from '../blossom/detect';
import type { Layer } from '../blossom/types';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { NO_VERTEX, plantForest, type AlternatingForest } from '../search/forest';
import { growStep } from '../search/growForest';
import { foldForest } from './foldForest';

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
const lanterns = unwrap(
  createMatching(petals, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

describe('folding the forest along with the garden', () => {
  it('the five petals become one sun hanging where b hung (level 4.4)', () => {
    // As the player grows it from R: R sun, a moon, b sun, c moon, d sun, g moon, f sun.
    let forest: AlternatingForest = plantForest(lanterns, [0]);
    for (const [u, x] of [
      [0, 1],
      [2, 3],
      [2, 6],
    ] as const) {
      const step = growStep(lanterns, forest, u, x);
      if (step.kind !== 'grow') throw new Error('expected growth');
      forest = step.forest;
    }
    const before = openLayer(petals, lanterns);
    const { layer, blossom } = contract(before, findOddCycle(forest, 4, 5));
    // Folded garden: R a F e = 0 1 2 3.
    expect(foldForest(forest, before, layer, blossom)).toEqual({
      label: ['outer', 'inner', 'outer', 'none'],
      parent: [NO_VERTEX, 0, 1, NO_VERTEX],
      root: [0, 0, 0, NO_VERTEX],
    });
  });

  it('property: after every fold the forest is still an alternating forest', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        let layer: Layer = openLayer(graph, matching);
        for (;;) {
          const result = bipartiteSearch(layer.graph, layer.matching);
          if (result.ok) return;
          const { forest, from, to } = result.error;
          const folded = contract(layer, findOddCycle(forest, from, to));
          const next = foldForest(forest, layer, folded.layer, folded.blossom);
          expectForestInvariants(folded.layer.graph, folded.layer.matching, next);
          expect(next.label[folded.blossom]).toBe('outer');
          layer = folded.layer;
        }
      }),
    );
  });
});
