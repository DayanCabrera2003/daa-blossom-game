import { hasEdge } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { err, ok, type Result } from '../shared/result';
import { UNMATCHED, type Matching } from './types';

/** Why a raw mate array is not a matching of a given graph. */
export type MateError =
  | { readonly code: 'wrongLength'; readonly expected: number; readonly actual: number }
  | { readonly code: 'invalidPartner'; readonly vertex: VertexId; readonly partner: number }
  | { readonly code: 'asymmetric'; readonly vertex: VertexId; readonly partner: VertexId }
  | { readonly code: 'notAnEdge'; readonly vertex: VertexId; readonly partner: VertexId };

/**
 * Checks a raw mate array (from a save file, a trace replay or an algorithm under test) against
 * the matching invariants: right length, partners in range, symmetric, and every pair a vine.
 */
export function validateMate(graph: Graph, mate: readonly number[]): Result<Matching, MateError> {
  if (mate.length !== graph.n) {
    return err({ code: 'wrongLength', expected: graph.n, actual: mate.length });
  }
  for (const [vertex, partner] of mate.entries()) {
    if (partner === UNMATCHED) continue;
    if (!Number.isInteger(partner) || partner < 0 || partner >= graph.n || partner === vertex) {
      return err({ code: 'invalidPartner', vertex, partner });
    }
    if (mate[partner] !== vertex) return err({ code: 'asymmetric', vertex, partner });
    if (!hasEdge(graph, vertex, partner)) return err({ code: 'notAnEdge', vertex, partner });
  }
  return ok({ mate });
}
