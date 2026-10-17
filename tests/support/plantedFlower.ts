import fc from 'fast-check';
import { createGraph } from '../../src/core/graph/createGraph';
import { neighbors } from '../../src/core/graph/queries';
import type { Edge, Graph, VertexId } from '../../src/core/graph/types';
import { createMatching } from '../../src/core/matching/createMatching';
import { isExposed, isMatchedEdge } from '../../src/core/matching/queries';
import type { Matching } from '../../src/core/matching/types';
import { unwrap } from '../../src/core/shared/result';
import { allPairs } from './arbitraries';

/** A random garden with a flower planted in it, its base in the dark (the setting of 4.11). */
export interface PlantedFlower {
  readonly graph: Graph;
  readonly matching: Matching;
  /** The petals around the loop, base first: (flower[1], flower[2]), (flower[3], flower[4])… lit. */
  readonly flower: readonly VertexId[];
}

/**
 * Arbitrary garden of up to `maxN` sprouts with an odd loop of 3, 5 or 7 petals planted on random
 * sprouts: the loop's vines are always there, its lanterns go round in pairs leaving the base in the
 * dark, any other vine may or may not be, and the sprouts outside get lanterns of their own among
 * themselves (greedily, over a random order of their vines), so no lantern leaves the flower.
 */
export const plantedFlowerArb = ({ maxN = 9 } = {}): fc.Arbitrary<PlantedFlower> =>
  fc
    .integer({ min: 3, max: maxN })
    .chain((n) =>
      fc.tuple(
        fc.constant(n),
        fc.constantFrom(...[3, 5, 7].filter((k) => k <= n)),
        fc.shuffledSubarray([...Array(n).keys()], { minLength: n, maxLength: n }),
        fc.subarray(allPairs(n)),
        fc.func(fc.integer()),
      ),
    )
    .map(([n, k, order, extra, rank]) => {
      const flower = order.slice(0, k);
      const at = (i: number): VertexId => flower[i % k] as VertexId;
      const loop: Edge[] = flower.map((_, i) => [at(i), at(i + 1)]);
      const graph = unwrap(createGraph(n, dedupe([...loop, ...extra])));
      const lit: Edge[] = [];
      for (let i = 1; i < k; i += 2) lit.push([at(i), at(i + 1)]);
      // Lanterns outside the flower, among sprouts outside it, in a random order of their vines.
      const inside = new Set(flower);
      const used = new Set<VertexId>();
      const outside = graph.edges
        .filter(([u, v]) => !inside.has(u) && !inside.has(v))
        .sort((a, b) => rank(a) - rank(b));
      for (const [u, v] of outside) {
        if (used.has(u) || used.has(v)) continue;
        used.add(u).add(v);
        lit.push([u, v]);
      }
      return { graph, matching: unwrap(createMatching(graph, lit)), flower };
    });

/** The vines of a list, each once, ends in order. */
function dedupe(edges: readonly Edge[]): Edge[] {
  const seen = new Map<string, Edge>();
  for (const [u, v] of edges) {
    const edge: Edge = u < v ? [u, v] : [v, u];
    seen.set(`${edge[0]}-${edge[1]}`, edge);
  }
  return [...seen.values()];
}

/**
 * Every chain (augmenting path) of a garden, each in both directions: a depth-first walk from
 * every sprout in the dark along alternating simple paths. Exponential, for small gardens only.
 */
export function everyChain(graph: Graph, matching: Matching): VertexId[][] {
  const chains: VertexId[][] = [];
  const walk = (path: VertexId[], nextLit: boolean): void => {
    const last = path[path.length - 1] as VertexId;
    for (const next of neighbors(graph, last)) {
      if (path.includes(next) || isMatchedEdge(matching, last, next) !== nextLit) continue;
      const longer = [...path, next];
      if (!nextLit && isExposed(matching, next)) chains.push(longer);
      walk(longer, !nextLit);
    }
  };
  for (let v = 0; v < graph.n; v++) if (isExposed(matching, v)) walk([v], false);
  return chains;
}
