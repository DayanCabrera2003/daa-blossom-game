import { hasEdge } from '../graph/queries';
import type { Edge, Graph, VertexId } from '../graph/types';
import { err, ok, type Result } from '../shared/result';
import { UNMATCHED, type Matching } from './types';

/** Why a list of pairs is not a matching of a given graph. */
export type MatchingError =
  | { readonly code: 'vertexOutOfRange'; readonly edge: Edge; readonly vertex: number }
  | { readonly code: 'notAnEdge'; readonly edge: Edge }
  | { readonly code: 'alreadyMatched'; readonly edge: Edge; readonly vertex: VertexId };

/** The matching with no lanterns lit. */
export function emptyMatching(graph: Graph): Matching {
  return { mate: new Array<VertexId>(graph.n).fill(UNMATCHED) };
}

/**
 * Builds a matching from its lit pairs (e.g. the lanterns a level starts with), checking that each
 * pair is a vine and that no sprout ends up with two lanterns (exclusivity).
 */
export function createMatching(
  graph: Graph,
  pairs: readonly Edge[],
): Result<Matching, MatchingError> {
  const mate = new Array<VertexId>(graph.n).fill(UNMATCHED);
  for (const edge of pairs) {
    for (const vertex of edge) {
      if (!Number.isInteger(vertex) || vertex < 0 || vertex >= graph.n) {
        return err({ code: 'vertexOutOfRange', edge, vertex });
      }
    }
    const [u, v] = edge;
    if (!hasEdge(graph, u, v)) return err({ code: 'notAnEdge', edge });
    for (const vertex of edge) {
      if (mate[vertex] !== UNMATCHED) return err({ code: 'alreadyMatched', edge, vertex });
    }
    mate[u] = v;
    mate[v] = u;
  }
  return ok({ mate });
}
