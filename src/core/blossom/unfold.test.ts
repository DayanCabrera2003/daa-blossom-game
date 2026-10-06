import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { contract, openLayer } from './contract';
import { findOddCycle } from './detect';
import type { Layer } from './types';
import { unfoldLayer } from './unfold';

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
const lanterns = unwrap(
  createMatching(wild, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

describe('unfolding a flower in the garden', () => {
  it('opening the only flower gives back the open garden (level 4.5)', () => {
    const open = openLayer(wild, lanterns);
    const { layer, blossom } = contract(open, [2, 3, 4]);
    expect(unfoldLayer(layer, blossom)).toEqual(open);
  });

  it('opening F2 brings back the garden where only F1 was folded (level 5.2)', () => {
    const first = contract(openLayer(wild, lanterns), [2, 3, 4]).layer;
    const second = contract(first, [0, 1, 2, 3, 4]);
    expect(unfoldLayer(second.layer, second.blossom)).toEqual(first);
  });

  it('only a flower can be opened', () => {
    expect(() => unfoldLayer(openLayer(wild, lanterns), 0)).toThrow();
  });

  it('property: unfolding undoes every fold, in reverse order', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const layers: Layer[] = [openLayer(graph, matching)];
        const blossoms: number[] = [];
        for (;;) {
          const top = layers.at(-1) as Layer;
          const result = bipartiteSearch(top.graph, top.matching);
          if (result.ok) break;
          const { forest, from, to } = result.error;
          const folded = contract(top, findOddCycle(forest, from, to));
          layers.push(folded.layer);
          blossoms.push(folded.blossom);
        }
        for (let k = layers.length - 1; k > 0; k--) {
          expect(unfoldLayer(layers[k] as Layer, blossoms[k - 1] as number)).toEqual(layers[k - 1]);
        }
      }),
    );
  });
});
