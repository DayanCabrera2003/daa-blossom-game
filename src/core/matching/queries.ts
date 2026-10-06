import type { Edge, VertexId } from '../graph/types';
import { invariant } from '../shared/invariant';
import { UNMATCHED, type Matching } from './types';

/** Partner of `v`, or `UNMATCHED` if `v` sleeps in the dark. Asking about a foreign vertex is a bug. */
export function mateOf(matching: Matching, v: VertexId): VertexId | typeof UNMATCHED {
  const partner = matching.mate[v];
  invariant(partner !== undefined, `vertex ${v} is not in the matching`);
  return partner;
}

/** Whether `v` has no lantern (an exposed vertex). */
export function isExposed(matching: Matching, v: VertexId): boolean {
  return mateOf(matching, v) === UNMATCHED;
}

/** Whether `u` and `v` share a lantern. */
export function isMatchedEdge(matching: Matching, u: VertexId, v: VertexId): boolean {
  return mateOf(matching, u) === v;
}

/** Every sprout in the dark, in ascending order. */
export function exposedVertices(matching: Matching): VertexId[] {
  const exposed: VertexId[] = [];
  matching.mate.forEach((partner, v) => {
    if (partner === UNMATCHED) exposed.push(v);
  });
  return exposed;
}

/** Every lit pair, normalized (`u < v`) and sorted by its first endpoint. */
export function matchedEdges(matching: Matching): Edge[] {
  const edges: Edge[] = [];
  matching.mate.forEach((partner, v) => {
    if (partner !== UNMATCHED && v < partner) edges.push([v, partner]);
  });
  return edges;
}

/** Number of lit lanterns, |M|. */
export function size(matching: Matching): number {
  return matchedEdges(matching).length;
}
