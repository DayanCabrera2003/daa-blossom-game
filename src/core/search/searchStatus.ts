import type { Layer } from '../blossom/types';
import type { VertexId } from '../graph/types';
import { isExposed, isMatchedEdge } from '../matching/queries';
import { plantForest, type AlternatingForest } from './forest';
import { growStep } from './growForest';

/**
 * Where a search stands (chapters 3 and 4):
 * - `open`: there is still something to explore;
 * - `chain`: the marks reach a chain, one look away or already seen;
 * - `conflict`: only vines between two suns of one tree are left, and folding is allowed, so the
 *   search is not over: the loop has to be folded first (4.4);
 * - `exhausted`: the search is over without a chain.
 */
export type SearchStatus = 'open' | 'chain' | 'conflict' | 'exhausted';

/** What the level lets the search do. */
export interface SearchRules {
  /**
   * The original sprouts allowed to start a search (a level's `roots`), or null when any sprout in
   * the dark may (the default).
   */
  readonly roots: readonly VertexId[] | null;
  /** Whether a loop where two suns of one tree meet may be folded (`foldAt`, from 4.4). */
  readonly foldAllowed: boolean;
}

/**
 * Where the search `forest` (the player's marks, on the ids of `layer`; null before the first
 * mark) stands in the garden `layer`, flowers included. It is judged on the true garden even in the
 * fog: a sprout the player has not inspected does not end the search.
 *
 * A dark vine from a sun is unexplored exactly when its other end has no mark yet. Looking along it
 * (`markMoon`) either marks that end a moon and its partner a sun, after which the vine leads to a
 * moon and teaches nothing new (3.3), or finds a chain because the end is in the dark. A vine to a
 * sun of another tree is a chain too (3.4), and one to a sun of the same tree is the conflict of
 * 4.1. These are the rules of `growStep`, the same `markMoon` applies, so the status always agrees
 * with what the marks can still do; a chain is found exactly when a look sets `chainSeen`.
 *
 * The search is also open while a sprout allowed to start one is in the dark and unmarked. Without
 * folding (4.1), a conflict is passed over as "already marked, I leave it" and the search counts as
 * exhausted, which is how the light "lies"; with folding, it means "fold it".
 */
export function searchStatus(
  layer: Layer,
  forest: AlternatingForest | null,
  { roots, foldAllowed }: SearchRules,
): SearchStatus {
  const marks = forest ?? plantForest(layer.matching, []);
  let open = false;
  let conflict = false;
  for (const [a, b] of layer.graph.edges) {
    if (isMatchedEdge(layer.matching, a, b)) continue;
    for (const [u, x] of [
      [a, b],
      [b, a],
    ] as const) {
      if (marks.label[u] !== 'outer') continue;
      const step = growStep(layer.matching, marks, u, x);
      if (step.kind === 'chain') return 'chain';
      if (step.kind === 'grow') open = true;
      if (step.kind === 'oddCycle') conflict = true;
    }
  }

  const mayStart = (node: VertexId): boolean =>
    roots === null || roots.some((root) => layer.nodeOf[root] === node);
  const rootLeft = marks.label.some(
    (mark, node) => mark === 'none' && isExposed(layer.matching, node) && mayStart(node),
  );
  if (open || rootLeft) return 'open';
  return conflict && foldAllowed ? 'conflict' : 'exhausted';
}
