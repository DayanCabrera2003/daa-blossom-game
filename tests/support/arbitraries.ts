import fc from 'fast-check';
import { createGraph } from '../../src/core/graph/createGraph';
import type { Edge, Graph } from '../../src/core/graph/types';
import { createMatching } from '../../src/core/matching/createMatching';
import type { Matching } from '../../src/core/matching/types';
import { unwrap } from '../../src/core/shared/result';

/** Every unordered pair of distinct vertices among `n`, i.e. the edges of the complete graph K_n. */
export const allPairs = (n: number): Edge[] => {
  const pairs: Edge[] = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) pairs.push([u, v]);
  return pairs;
};

/**
 * Arbitrary simple graph with up to `maxN` vertices and any subset of edges. Small sizes keep
 * brute-force oracles exact while fast-check still explores thousands of shapes.
 */
export const graphArb = ({ minN = 0, maxN = 10 } = {}): fc.Arbitrary<Graph> =>
  fc
    .integer({ min: minN, max: maxN })
    .chain((n) => fc.subarray(allPairs(n)).map((edges) => unwrap(createGraph(n, edges))));

/** Arbitrary graph paired with a valid vertex of it (requires at least one vertex). */
export const graphWithVertexArb = ({ maxN = 10 } = {}): fc.Arbitrary<[Graph, number]> =>
  graphArb({ minN: 1, maxN }).chain((graph) =>
    fc.tuple(fc.constant(graph), fc.integer({ min: 0, max: graph.n - 1 })),
  );

/** Keeps each edge unless it clashes with one already kept: always yields a matching. */
const greedyMatching = (graph: Graph, edges: readonly Edge[]): Matching => {
  const used = new Set<number>();
  const pairs = edges.filter(([u, v]) => {
    if (used.has(u) || used.has(v)) return false;
    used.add(u).add(v);
    return true;
  });
  return unwrap(createMatching(graph, pairs));
};

/** Arbitrary matching of `graph`: greedy over a random ordering of a random subset of its edges. */
export const matchingArb = (graph: Graph): fc.Arbitrary<Matching> =>
  fc.shuffledSubarray([...graph.edges]).map((edges) => greedyMatching(graph, edges));

/** Arbitrary graph together with one matching of it. */
export const graphWithMatchingArb = ({ maxN = 10 } = {}): fc.Arbitrary<[Graph, Matching]> =>
  graphArb({ maxN }).chain((graph) => fc.tuple(fc.constant(graph), matchingArb(graph)));

/** Arbitrary graph together with two independent matchings of it (for M ⊕ M′ properties). */
export const graphWithTwoMatchingsArb = ({ maxN = 10 } = {}): fc.Arbitrary<
  [Graph, Matching, Matching]
> =>
  graphArb({ maxN }).chain((graph) =>
    fc.tuple(fc.constant(graph), matchingArb(graph), matchingArb(graph)),
  );

/**
 * Arbitrary bipartite graph (bees and flowers): each vertex gets a random side and edges are any
 * subset of the vines joining opposite sides. Sides are interleaved, not split by id ranges, so
 * nothing downstream can accidentally rely on vertex order to find the bipartition.
 */
export const bipartiteGraphArb = ({ maxN = 10 } = {}): fc.Arbitrary<Graph> =>
  fc
    .integer({ min: 0, max: maxN })
    .chain((n) => fc.array(fc.boolean(), { minLength: n, maxLength: n }))
    .chain((side) => {
      const crossing = allPairs(side.length).filter(([u, v]) => side[u] !== side[v]);
      return fc.subarray(crossing).map((edges) => unwrap(createGraph(side.length, edges)));
    });

/** Arbitrary bipartite graph together with one matching of it. */
export const bipartiteWithMatchingArb = ({ maxN = 10 } = {}): fc.Arbitrary<[Graph, Matching]> =>
  bipartiteGraphArb({ maxN }).chain((graph) => fc.tuple(fc.constant(graph), matchingArb(graph)));

/**
 * Arbitrary graph with a random density: an edge probability p ∈ {5 %, 10 %, …, 95 %} is drawn
 * first, then each vine is kept with probability p. Uniform edge subsets (`graphArb`) concentrate
 * around density ½; this spreads the cases from near-empty gardens to near-complete ones.
 */
export const graphWithDensityArb = ({ maxN = 12 } = {}): fc.Arbitrary<Graph> =>
  fc.tuple(fc.integer({ min: 0, max: maxN }), fc.integer({ min: 1, max: 19 })).chain(([n, p]) => {
    const pairs = allPairs(n);
    return fc
      .array(fc.integer({ min: 0, max: 19 }), { minLength: pairs.length, maxLength: pairs.length })
      .map((draws) =>
        unwrap(
          createGraph(
            n,
            pairs.filter((_, i) => (draws[i] as number) < p),
          ),
        ),
      );
  });
