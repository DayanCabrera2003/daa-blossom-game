import type { Graph, VertexId } from '../graph/types';
import { flipAlong } from '../matching/augment';
import { checkStem, type PathError } from '../matching/paths';
import type { Matching } from '../matching/types';
import { ok, type Result } from '../shared/result';

/**
 * Rotates the stem of a flower (level 4.10; Códex C8, direction ii): passes the lanterns along an
 * even alternating path from a sprout in the dark to the base. The path has as many lit vines as
 * dark ones, so |M| does not change, but the darkness moves from the root to the base. Inside the
 * flower nothing changes, so the loop is still a flower, now with its base in the dark: the
 * "without loss of generality" step of the flower lemma.
 */
export function rotateStem(
  graph: Graph,
  matching: Matching,
  stem: readonly VertexId[],
): Result<Matching, PathError> {
  const checked = checkStem(graph, matching, stem);
  if (!checked.ok) return checked;
  return ok(flipAlong(matching, stem));
}
