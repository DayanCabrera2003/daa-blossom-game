import { hasEdge } from '../graph/queries';
import type { Edge, Graph, VertexId } from '../graph/types';
import { err, ok, type Result } from '../shared/result';
import { mateOf } from './queries';
import { UNMATCHED, type Matching } from './types';

/** Why a lantern cannot be lit or put out. */
export type EditError =
  | { readonly code: 'notAnEdge'; readonly edge: Edge }
  | { readonly code: 'alreadyMatched'; readonly vertex: VertexId }
  | { readonly code: 'notMatched'; readonly edge: Edge };

/** Lights a lantern on the vine u–v (the "join" action). Both sprouts must be in the dark. */
export function addPair(
  graph: Graph,
  matching: Matching,
  u: VertexId,
  v: VertexId,
): Result<Matching, EditError> {
  if (!hasEdge(graph, u, v)) return err({ code: 'notAnEdge', edge: [u, v] });
  for (const vertex of [u, v]) {
    if (mateOf(matching, vertex) !== UNMATCHED) return err({ code: 'alreadyMatched', vertex });
  }
  const mate = [...matching.mate];
  mate[u] = v;
  mate[v] = u;
  return ok({ mate });
}

/** Puts out the lantern shared by u and v (the "split" action). */
export function removePair(
  matching: Matching,
  u: VertexId,
  v: VertexId,
): Result<Matching, EditError> {
  if (mateOf(matching, u) !== v) return err({ code: 'notMatched', edge: [u, v] });
  const mate = [...matching.mate];
  mate[u] = UNMATCHED;
  mate[v] = UNMATCHED;
  return ok({ mate });
}
