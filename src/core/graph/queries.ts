import { invariant } from '../shared/invariant';
import type { Graph, VertexId } from './types';

/** Fails loudly when a caller passes a vertex that does not belong to the graph (a bug). */
function assertVertex(graph: Graph, v: VertexId): void {
  invariant(
    Number.isInteger(v) && v >= 0 && v < graph.n,
    `vertex ${v} is not in a graph of ${graph.n}`,
  );
}

/** Neighbors of `v`, in ascending order. */
export function neighbors(graph: Graph, v: VertexId): readonly VertexId[] {
  assertVertex(graph, v);
  return graph.adjacency[v] ?? [];
}

/** Number of vines attached to sprout `v`. */
export function degree(graph: Graph, v: VertexId): number {
  return neighbors(graph, v).length;
}

/** Whether `u` and `v` are joined by an edge. Checks the shorter adjacency list. */
export function hasEdge(graph: Graph, u: VertexId, v: VertexId): boolean {
  assertVertex(graph, u);
  assertVertex(graph, v);
  const [from, to] = degree(graph, u) <= degree(graph, v) ? [u, v] : [v, u];
  return neighbors(graph, from).includes(to);
}

/** Orientation-independent key for an edge, for use in sets and maps. */
export function edgeKey(u: VertexId, v: VertexId): string {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}
