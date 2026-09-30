import { err, ok, type Result } from '../shared/result';
import type { Edge, Graph, VertexId } from './types';

/** Why a vertex count and edge list do not describe a simple undirected graph. */
export type GraphError =
  | { readonly code: 'invalidVertexCount'; readonly n: number }
  | { readonly code: 'vertexOutOfRange'; readonly edge: Edge; readonly vertex: number }
  | { readonly code: 'selfLoop'; readonly vertex: VertexId }
  | { readonly code: 'duplicateEdge'; readonly edge: Edge };

/**
 * The only way to build a `Graph`. Validates the input and normalizes it so that the invariants
 * documented on `Graph` hold (normalized sorted edges, ascending adjacency lists).
 * Errors are values because edge lists come from level files and the sandbox editor.
 */
export function createGraph(n: number, rawEdges: readonly Edge[]): Result<Graph, GraphError> {
  if (!Number.isInteger(n) || n < 0) return err({ code: 'invalidVertexCount', n });

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const edge of rawEdges) {
    for (const vertex of edge) {
      if (!Number.isInteger(vertex) || vertex < 0 || vertex >= n) {
        return err({ code: 'vertexOutOfRange', edge, vertex });
      }
    }
    const [a, b] = edge;
    if (a === b) return err({ code: 'selfLoop', vertex: a });

    const normalized: Edge = a < b ? [a, b] : [b, a];
    const key = `${normalized[0]}-${normalized[1]}`;
    if (seen.has(key)) return err({ code: 'duplicateEdge', edge: normalized });
    seen.add(key);
    edges.push(normalized);
  }

  edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);

  const adjacency: VertexId[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adjacency[u]?.push(v);
    adjacency[v]?.push(u);
  }
  for (const neighbors of adjacency) neighbors.sort((x, y) => x - y);

  return ok({ n, edges, adjacency });
}
