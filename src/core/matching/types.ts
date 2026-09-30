import type { VertexId } from '../graph/types';

/** Marker for a sprout sleeping in the dark: no lantern, not matched. */
export const UNMATCHED = -1;

/**
 * A matching (the lit lanterns of a garden) stored as a mate array: `mate[v]` is the vertex that
 * shares a lantern with `v`, or `UNMATCHED`. Built only by validated constructors, so consumers can
 * rely on `mate[mate[v]] === v` and on every matched pair being an edge of its graph.
 */
export interface Matching {
  readonly mate: readonly (VertexId | typeof UNMATCHED)[];
}
