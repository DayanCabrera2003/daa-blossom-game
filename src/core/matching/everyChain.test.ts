import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { pathGraph } from '../generators/families';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { everyChain } from './everyChain';
import { checkAugmentingPath, checkStem } from './paths';

describe('everyChain', () => {
  it('lists every chain the player could drag from a sprout in the dark', () => {
    // 0–1=2–3: chains from 0 and from 3, winning or of gain 0.
    const path = pathGraph(4);
    const lit = unwrap(createMatching(path, [[1, 2]]));
    expect(everyChain(path, lit)).toEqual([
      [0, 1, 2],
      [0, 1, 2, 3],
      [3, 2, 1],
      [3, 2, 1, 0],
    ]);
  });

  it('property: each one is a winning chain or one of gain 0, and none is listed twice', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 8 }), ([graph, matching]) => {
        const chains = everyChain(graph, matching);
        for (const chain of chains) {
          const legal =
            checkAugmentingPath(graph, matching, chain).ok || checkStem(graph, matching, chain).ok;
          expect(legal).toBe(true);
        }
        expect(new Set(chains.map((chain) => chain.join())).size).toBe(chains.length);
      }),
    );
  });
});
