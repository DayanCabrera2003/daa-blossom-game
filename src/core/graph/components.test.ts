import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { InvariantError } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { connectedComponents } from './components';
import { createGraph } from './createGraph';
import type { Graph, VertexId } from './types';

/** Independent union–find oracle: the partition the components must match. */
function unionFindPartition(graph: Graph, removed: ReadonlySet<VertexId>): VertexId[][] {
  const parent = Array.from({ length: graph.n }, (_, v) => v);
  const find = (v: VertexId): VertexId => {
    while (parent[v] !== v) v = parent[v] as VertexId;
    return v;
  };
  for (const [u, v] of graph.edges) {
    if (!removed.has(u) && !removed.has(v)) parent[find(u)] = find(v);
  }
  const groups = new Map<VertexId, VertexId[]>();
  for (let v = 0; v < graph.n; v++) {
    if (removed.has(v)) continue;
    const root = find(v);
    groups.set(root, [...(groups.get(root) ?? []), v]);
  }
  return [...groups.values()].sort((a, b) => (a[0] as number) - (b[0] as number));
}

// Path 0-1-2-3-4, plus the separate edge 5-6 and the isolated vertex 7.
const garden = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [5, 6],
  ]),
);

describe('connectedComponents', () => {
  it('returns no components for the empty graph', () => {
    expect(connectedComponents(unwrap(createGraph(0, [])))).toEqual([]);
  });

  it('groups vertices, ordering components by their smallest vertex', () => {
    expect(connectedComponents(garden)).toEqual([[0, 1, 2, 3, 4], [5, 6], [7]]);
  });

  it('ignores removed vertices and the edges through them (lifting a stone splits the garden)', () => {
    expect(connectedComponents(garden, new Set([2]))).toEqual([[0, 1], [3, 4], [5, 6], [7]]);
  });

  it('rejects removed vertices that are not in the graph', () => {
    expect(() => connectedComponents(garden, new Set([8]))).toThrow(InvariantError);
  });

  it('property: matches an independent union–find partition', () => {
    fc.assert(
      fc.property(
        graphArb().chain((g) =>
          fc.tuple(
            fc.constant(g),
            fc.subarray(Array.from({ length: g.n }, (_, v) => v)).map((vs) => new Set(vs)),
          ),
        ),
        ([g, removed]) => {
          expect(connectedComponents(g, removed)).toEqual(unionFindPartition(g, removed));
        },
      ),
    );
  });
});
