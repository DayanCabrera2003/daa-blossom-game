import { invariant } from '../shared/invariant';
import type { Graph, VertexId } from './types';

/**
 * Neighbors of `v`, in ascending order. Fails loudly when `v` does not belong to the graph:
 * callers only ever pass vertices they got from the graph itself, so that would be a bug.
 */
export function neighbors(graph: Graph, v: VertexId): readonly VertexId[] {
  const list = Number.isInteger(v) ? graph.adjacency[v] : undefined;
  invariant(list !== undefined, `vertex ${v} is not in a graph of ${graph.n}`);
  return list;
}

/** Number of vines attached to sprout `v`. */
export function degree(graph: Graph, v: VertexId): number {
  return neighbors(graph, v).length;
}

/** Whether `u` and `v` are joined by an edge. Checks the shorter adjacency list. */
export function hasEdge(graph: Graph, u: VertexId, v: VertexId): boolean {
  const [from, to] = degree(graph, u) <= degree(graph, v) ? [u, v] : [v, u];
  return neighbors(graph, from).includes(to);
}

/** Orientation-independent key for an edge, for use in sets and maps. */
export function edgeKey(u: VertexId, v: VertexId): string {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}
