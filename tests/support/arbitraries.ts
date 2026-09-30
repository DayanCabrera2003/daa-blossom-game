import fc from 'fast-check';
import { createGraph } from '../../src/core/graph/createGraph';
import type { Edge, Graph } from '../../src/core/graph/types';
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
