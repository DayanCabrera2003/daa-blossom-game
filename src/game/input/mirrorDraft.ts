import { hasEdge } from '@core/graph/queries';
import type { Edge, Graph, VertexId } from '@core/graph/types';
import { emptyMatching } from '@core/matching/createMatching';
import { addPair, removePair } from '@core/matching/edit';
import { mateOf, matchedEdges } from '@core/matching/queries';
import { UNMATCHED, type Matching } from '@core/matching/types';
import type { RejectReason } from '@core/rules/reasons';
import { err, ok, unwrap, type Result } from '@core/shared/result';

/**
 * The reflection the player draws in the mirror challenge (GDD 2.4, plan 03 phase 8): silver
 * lanterns over the garden, put in and taken out one vine at a time. A vine is chosen by touching
 * the vine itself, as a lit vine is touched to put it out and a vine is touched to fold at it, so
 * every silver lantern costs one touch and `HitTest` already tells which vine lies under it. The
 * drawing is kept as a core matching, so it never leaves a sprout with two silver lanterns: such a
 * touch is refused with a gentle reason, as the rules refuse a move.
 */

/** Why a touch on a vine could not change the drawing. */
export type DraftRefusal =
  /** Putting the vine in silver would give `vertex` a second silver lantern. */
  | { readonly code: 'twoSilver'; readonly vertex: VertexId }
  /** The two sprouts share no vine (only a walkthrough or a hint could name such a pair). */
  | Extract<RejectReason, { readonly code: 'notAdjacent' }>;

/** A drawing with no silver lantern yet. */
export const emptyDraft = (graph: Graph): Matching => emptyMatching(graph);

/** The silver lanterns of a drawing, each vine with its smaller sprout first, in sprout order. */
export const drawnPairs = (draft: Matching): Edge[] => matchedEdges(draft);

/**
 * A touch on the vine u–v: a silver vine is taken out of the drawing, any other is put in, unless
 * one of its sprouts already holds another silver lantern.
 */
export function toggleDraft(
  graph: Graph,
  draft: Matching,
  u: VertexId,
  v: VertexId,
): Result<Matching, DraftRefusal> {
  if (!hasEdge(graph, u, v)) return err({ code: 'notAdjacent', u, v });
  // A silver vine is taken out; the core's own edits keep the drawing a set of lanterns.
  if (mateOf(draft, u) === v) return ok(unwrap(removePair(draft, u, v)));
  const taken = [u, v].find((vertex) => mateOf(draft, vertex) !== UNMATCHED);
  if (taken !== undefined) return err({ code: 'twoSilver', vertex: taken });
  return ok(unwrap(addPair(graph, draft, u, v)));
}
