import { hasEdge } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { isMatchedEdge } from '../matching/queries';
import type { Matching } from '../matching/types';
import { err, ok, type Result } from '../shared/result';
import { itemAt } from '../shared/itemAt';

/**
 * Why a loop of sprouts is not a flower. Indices point into the given loop so the game can
 * highlight the culprit. For `notAdjacent`, `index` is the vine from loop[index] to the next
 * sprout (wrapping around); for `notAlternating`, it is a sprout where two dark vines meet.
 */
export type BlossomError =
  | { readonly code: 'tooShort' }
  | { readonly code: 'evenLength'; readonly length: number }
  | { readonly code: 'vertexOutOfRange'; readonly index: number; readonly vertex: number }
  | { readonly code: 'repeatedVertex'; readonly index: number; readonly vertex: VertexId }
  | { readonly code: 'notAdjacent'; readonly index: number }
  | { readonly code: 'notAlternating'; readonly index: number };

/**
 * A flower (blossom, Códex C7): a simple loop of odd length 2k + 1 holding k lanterns. Lit vines
 * can never touch (exclusivity), so with k of them on 2k + 1 vines exactly one sprout sits between
 * two dark vines: the base. Its lantern, if any, must go outside the loop.
 *
 * On success returns the same loop, in the same direction, rotated so the base comes first; that
 * is the normal form `contract` expects.
 */
export function checkBlossom(
  graph: Graph,
  matching: Matching,
  loop: readonly VertexId[],
): Result<VertexId[], BlossomError> {
  if (loop.length < 3) return err({ code: 'tooShort' });
  if (loop.length % 2 === 0) return err({ code: 'evenLength', length: loop.length });

  const seen = new Set<VertexId>();
  for (const [index, vertex] of loop.entries()) {
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= graph.n) {
      return err({ code: 'vertexOutOfRange', index, vertex });
    }
    if (seen.has(vertex)) return err({ code: 'repeatedVertex', index, vertex });
    seen.add(vertex);
  }

  const at = (index: number): VertexId => itemAt(loop, (index + loop.length) % loop.length);
  const lit: boolean[] = [];
  for (let index = 0; index < loop.length; index++) {
    if (!hasEdge(graph, at(index), at(index + 1))) return err({ code: 'notAdjacent', index });
    lit.push(isMatchedEdge(matching, at(index), at(index + 1)));
  }

  // A sprout where the vine arriving (index − 1) and the one leaving (index) are both dark.
  let base: number | null = null;
  for (let index = 0; index < loop.length; index++) {
    const arriving = lit[(index - 1 + loop.length) % loop.length] as boolean;
    if (arriving || (lit[index] as boolean)) continue;
    if (base !== null) return err({ code: 'notAlternating', index });
    base = index;
  }
  // Odd length forbids perfect alternation, so some dark meeting point always exists.
  const start = base as number;
  return ok(loop.map((_, offset) => at(start + offset)));
}
