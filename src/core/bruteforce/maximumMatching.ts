import { neighbors } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { UNMATCHED, type Matching } from '../matching/types';
import { createBudget } from './budget';

/** How Bruto's search ended: he either tried every combination or ran out of steps. */
export type BruteForceOutcome =
  | { readonly status: 'complete'; readonly matching: Matching; readonly steps: number }
  | { readonly status: 'gaveUp'; readonly best: Matching; readonly steps: number };

/** Search options; `budget` caps the number of partial combinations examined (unlimited by default). */
export interface BruteForceOptions {
  readonly budget?: number;
}

/**
 * Bruto: exhaustive backtracking over every matching of the graph. Vertices are decided in
 * ascending order; the lowest undecided sprout either shares a lantern with a higher undecided
 * neighbor (tried in ascending order) or stays in the dark. Every matching is therefore generated
 * exactly once, so the answer is optimal by plain enumeration: no theory, which is the point of
 * the character and the reason it is the reference for every test of the real algorithm.
 *
 * One step is one partial combination visited (one node of the search tree). The count grows with
 * the number of matchings, which is exponential in n: that is the curve of the race in chapter 6.
 * With a budget, the search stops as soon as a step is refused and returns the best matching seen.
 */
export function bruteForceMatching(
  graph: Graph,
  options: BruteForceOptions = {},
): BruteForceOutcome {
  const budget = createBudget(options.budget);
  const mate = new Array<VertexId>(graph.n).fill(UNMATCHED);
  let best: VertexId[] = [...mate];
  let bestSize = 0;
  let currentSize = 0;
  let stopped = false;

  const explore = (start: VertexId): void => {
    if (!budget.spend()) {
      stopped = true;
      return;
    }
    if (currentSize > bestSize) {
      best = [...mate];
      bestSize = currentSize;
    }
    // Skip sprouts already lit by a lower partner; vertices below `start` are all decided.
    let v = start;
    while (v < graph.n && mate[v] !== UNMATCHED) v++;
    if (v === graph.n) return;

    for (const w of neighbors(graph, v)) {
      if (w <= v || mate[w] !== UNMATCHED) continue;
      mate[v] = w;
      mate[w] = v;
      currentSize++;
      explore(v + 1);
      currentSize--;
      mate[v] = UNMATCHED;
      mate[w] = UNMATCHED;
      if (stopped) return;
    }
    // Leave v in the dark for good: later choices only look at higher vertices.
    explore(v + 1);
  };

  explore(0);
  const steps = budget.steps;
  return stopped
    ? { status: 'gaveUp', best: { mate: best }, steps }
    : { status: 'complete', matching: { mate: best }, steps };
}
