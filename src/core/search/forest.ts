import type { VertexId } from '../graph/types';
import { isExposed } from '../matching/queries';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';

/** Marker for "no vertex": a root's parent, or the root of an unreached sprout. */
export const NO_VERTEX = -1;

/**
 * The mark a search puts on a sprout: a sun (outer: reached "with a free hand", even distance to
 * its root), a moon (inner: reached "asking for a lantern", odd distance) or nothing yet.
 */
export type ForestLabel = 'outer' | 'inner' | 'none';

/**
 * The alternating forest of a search (Códex C4). Each tree hangs from a sprout in the dark; moving
 * up from any sprout alternates dark vine (sun → moon) and lit vine (moon → sun), so every path to a
 * root is an alternating path. Arrays are indexed by vertex; unreached sprouts hold `NO_VERTEX`.
 */
export interface AlternatingForest {
  readonly label: readonly ForestLabel[];
  readonly parent: readonly (VertexId | typeof NO_VERTEX)[];
  readonly root: readonly (VertexId | typeof NO_VERTEX)[];
}

/**
 * Starts a forest: every root is a sun heading its own tree. The algorithm plants all sprouts in the
 * dark at once; the player in the fog (chapter 3) may start from just one. A lit root is a bug:
 * a chain can only start where there is no lantern.
 */
export function plantForest(matching: Matching, roots: readonly VertexId[]): AlternatingForest {
  const n = matching.mate.length;
  const label = new Array<ForestLabel>(n).fill('none');
  const parent = new Array<VertexId>(n).fill(NO_VERTEX);
  const root = new Array<VertexId>(n).fill(NO_VERTEX);
  for (const r of roots) {
    invariant(isExposed(matching, r), `root ${r} has a lantern`);
    invariant(label[r] === 'none', `root ${r} planted twice`);
    label[r] = 'outer';
    root[r] = r;
  }
  return { label, parent, root };
}
