import type { Edge, VertexId } from '../graph/types';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import { UNMATCHED, type Matching } from './types';

/**
 * Symmetric difference M ⊕ E: every lit vine of E is put out and every dark vine of E is lit.
 *
 * Callers pass sets that are known to produce a matching (a validated augmenting path, a stem, an
 * alternating cycle, a component of M ⊕ M′). If the result would give a sprout two lanterns, the
 * caller skipped validation, which is a bug, so this throws instead of returning an error.
 */
export function flipEdges(matching: Matching, edges: readonly Edge[]): Matching {
  const mate = [...matching.mate];
  const toLight: Edge[] = [];

  // Put out first, so a sprout whose lantern moves along the path is free when it is re-lit.
  for (const [u, v] of edges) {
    if (mate[u] === v) {
      mate[u] = UNMATCHED;
      mate[v] = UNMATCHED;
    } else {
      toLight.push([u, v]);
    }
  }
  for (const [u, v] of toLight) {
    invariant(
      mate[u] === UNMATCHED && mate[v] === UNMATCHED,
      `flipping ${u}-${v} would give a sprout two lanterns`,
    );
    mate[u] = v;
    mate[v] = u;
  }

  return { mate };
}

/** Flips the vines along a path given as a sequence of sprouts (passing the lanterns along it). */
export function flipAlong(matching: Matching, path: readonly VertexId[]): Matching {
  const edges: Edge[] = [];
  for (let i = 0; i + 1 < path.length; i++) edges.push([itemAt(path, i), itemAt(path, i + 1)]);
  return flipEdges(matching, edges);
}
