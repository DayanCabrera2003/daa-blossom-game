import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { fastEdmonds } from '../edmonds/fast/solve';
import type { Graph, VertexId } from '../graph/types';
import { createGraph } from '../graph/createGraph';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { checkAugmentingPath } from './paths';
import { isExposed, isMatchedEdge, size } from './queries';
import { shortestChain } from './shortestChain';
import type { Matching } from './types';

/** The length (in vines) of the shortest winning chain, found by trying every simple path. */
const shortestByHand = (graph: Graph, matching: Matching): number | null => {
  let best: number | null = null;
  const walk = (path: VertexId[], nextLit: boolean): void => {
    const last = path[path.length - 1] as VertexId;
    // A sprout in the dark has no lit vine, so a path ending on one ends on a dark vine.
    if (path.length > 1 && isExposed(matching, last)) {
      best = best === null ? path.length - 1 : Math.min(best, path.length - 1);
    }
    for (const next of graph.adjacency[last] ?? []) {
      if (path.includes(next) || isMatchedEdge(matching, last, next) !== nextLit) continue;
      walk([...path, next], !nextLit);
    }
  };
  for (let v = 0; v < graph.n; v++) if (isExposed(matching, v)) walk([v], false);
  return best;
};

describe('shortestChain', () => {
  // The bucket brigade 0-1-2-3-4-5 with lanterns 1=2 and 3=4, plus vine 0-5 closing it.
  const brigade = unwrap(
    createGraph(6, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ]),
  );
  const lit = unwrap(
    createMatching(brigade, [
      [1, 2],
      [3, 4],
    ]),
  );

  it('finds the whole brigade, the only chain there is', () => {
    expect(shortestChain(brigade, lit)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('takes two neighbors in the dark before any longer chain', () => {
    const graph = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ]),
    );
    const matching = unwrap(createMatching(graph, [[1, 2]]));
    expect(shortestChain(graph, matching)).toEqual([0, 1, 2, 3]);
    expect(shortestChain(graph, unwrap(createMatching(graph, [])))).toEqual([0, 1]);
  });

  it('finds nothing when no lantern more can be lit', () => {
    expect(
      shortestChain(
        brigade,
        unwrap(
          createMatching(brigade, [
            [0, 1],
            [2, 3],
            [4, 5],
          ]),
        ),
      ),
    ).toBe(null);
  });

  it('property: a winning chain exactly when more lanterns can be lit, and none is shorter', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 8 }), ([graph, matching]) => {
        const chain = shortestChain(graph, matching);
        const canGrow = size(fastEdmonds(graph)) > size(matching);
        expect(chain !== null).toBe(canGrow);
        if (chain === null) return;
        expect(checkAugmentingPath(graph, matching, chain).ok).toBe(true);
        expect(chain.length - 1).toBe(shortestByHand(graph, matching));
      }),
    );
  });
});
