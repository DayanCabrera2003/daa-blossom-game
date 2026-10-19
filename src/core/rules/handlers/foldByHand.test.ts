import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { plantedFlowerArb } from '../../../../tests/support/plantedFlower';
import { bruteForceMatching } from '../../bruteforce/maximumMatching';
import type { Graph } from '../../graph/types';
import { size } from '../../matching/queries';
import type { Matching } from '../../matching/types';
import { createGardenState } from '../state';
import { fold } from './fold';

/** Whether a garden still has a chain: its lanterns are fewer than the most it can hold. */
const hasChain = (graph: Graph, matching: Matching): boolean => {
  const best = bruteForceMatching(graph);
  if (best.status !== 'complete') throw new Error('an unbounded search always completes');
  return size(best.matching) > size(matching);
};

describe('folding by hand with the base in the dark (C8: folding neither makes nor hides chains)', () => {
  it('in random gardens, the folded garden has a chain exactly when the open one has', () => {
    fc.assert(
      fc.property(plantedFlowerArb(), ({ graph, matching, flower }) => {
        const state = createGardenState({ graph, matching, allowed: ['fold'] });
        const outcome = fold(state, { type: 'fold', loop: flower });
        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        const { layer } = outcome.state;
        expect(hasChain(layer.graph, layer.matching)).toBe(hasChain(graph, matching));
      }),
    );
  });
});
