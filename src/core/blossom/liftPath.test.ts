import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import type { VertexId } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { unwrap } from '../shared/result';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { contract, openLayer } from './contract';
import { findOddCycle } from './detect';
import { liftPath } from './liftPath';
import type { Layer } from './types';

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

describe('lifting a chain out of a folded flower', () => {
  it('enters by c and goes the only way that alternates (level 4.6)', () => {
    const open = openLayer(petals, petalLanterns);
    const { layer, blossom } = contract(open, [2, 3, 4, 5, 6]);
    // In the folded garden: R–a=F–e.
    expect(liftPath(open, layer, blossom, [0, 1, 2, 3])).toEqual([0, 1, 2, 6, 5, 4, 3, 7]);
    // The same chain read the other way round lifts to the same chain reversed.
    expect(liftPath(open, layer, blossom, [3, 2, 1, 0])).toEqual([7, 3, 4, 5, 6, 2, 1, 0]);
  });

  it('crosses the whole stem and leaves by the base (level 4.7)', () => {
    // R–a=b–c=d, triangle d–e=f–d, exit e–T. R a b c d e f T = 0 1 2 3 4 5 6 7.
    const longStem = unwrap(
      createGraph(8, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [4, 6],
        [5, 7],
      ]),
    );
    const lanterns = unwrap(
      createMatching(longStem, [
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    );
    const open = openLayer(longStem, lanterns);
    const { layer, blossom } = contract(open, [4, 5, 6]);
    expect(liftPath(open, layer, blossom, [0, 1, 2, 3, 4, 5])).toEqual([0, 1, 2, 3, 4, 6, 5, 7]);
  });

  it('a chain that does not touch the flower is only renamed', () => {
    const open = openLayer(petals, petalLanterns);
    const { layer, blossom } = contract(open, [2, 3, 4, 5, 6]);
    expect(liftPath(open, layer, blossom, [0, 1])).toEqual([0, 1]);
  });

  it('a flower in the dark at the end of the chain is opened down to its base (level 5.1)', () => {
    // R a b c d g h t = 0 1 2 3 4 5 6 7; F1 = {b, c, d}, then F2 = {R, a, F1, g, h}.
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
    const second = contract(first, [0, 1, 2, 3, 4]);
    // F2–t lifts to R–h=g–F1=a–t in the garden where only F1 is folded.
    expect(liftPath(first, second.layer, second.blossom, [0, 1])).toEqual([0, 4, 3, 2, 1, 5]);
  });

  it('property: lifting a chain layer by layer always gives a chain (C8, direction i)', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
        const layers: Layer[] = [openLayer(graph, matching)];
        const blossoms: VertexId[] = [];
        for (;;) {
          const top = layers.at(-1) as Layer;
          const result = bipartiteSearch(top.graph, top.matching);
          if (!result.ok) {
            const { forest, from, to } = result.error;
            const folded = contract(top, findOddCycle(forest, from, to));
            layers.push(folded.layer);
            blossoms.push(folded.blossom);
            continue;
          }
          if (result.value.kind === 'noPath') return;
          let path: readonly VertexId[] = result.value.path;
          for (let k = layers.length - 1; k > 0; k--) {
            const lower = layers[k - 1] as Layer;
            path = liftPath(lower, layers[k] as Layer, blossoms[k - 1] as VertexId, path);
            expect(checkAugmentingPath(lower.graph, lower.matching, path).ok).toBe(true);
          }
          return;
        }
      }),
    );
  });
});
