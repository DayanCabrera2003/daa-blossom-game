import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { fastEdmonds } from '../edmonds/fast/solve';
import { edmonds } from '../edmonds/solve';
import type { Graph } from '../graph/types';
import { size } from '../matching/queries';
import { invariant } from '../shared/invariant';
import { createOperationCounter } from './operationCounter';

/** One race on one garden: what each runner paid to light the same lanterns. */
export interface RaceResult {
  readonly n: number;
  readonly edges: number;
  /** Lanterns of the maximum matching, the finish line of the race. */
  readonly lanterns: number;
  /** Trace steps of the recipe the player watches (the didactic version). */
  readonly didacticSteps: number;
  /** Operations of the compact O(n³) version, the one Códex C11 analyses. */
  readonly fastOperations: number;
  /** Bruto either finishes or falls asleep when his budget runs out. */
  readonly bruto: { readonly status: 'complete' | 'gaveUp'; readonly steps: number };
}

/**
 * Races the didactic recipe, the fast version and Bruto on one garden (levels 6.4, 6.5). The two
 * versions of Edmonds must agree, and so must Bruto when he finishes: a race that disagreed would
 * be a bug, never a result to plot.
 */
export function race(graph: Graph, brutoBudget: number): RaceResult {
  const didactic = edmonds(graph);
  const counter = createOperationCounter();
  const lanterns = size(fastEdmonds(graph, undefined, counter));
  invariant(size(didactic.matching) === lanterns, 'the two versions of Edmonds disagree');
  const bruto = bruteForceMatching(graph, { budget: brutoBudget });
  if (bruto.status === 'complete') {
    invariant(size(bruto.matching) === lanterns, 'Bruto disagrees with Edmonds');
  }
  return {
    n: graph.n,
    edges: graph.edges.length,
    lanterns,
    didacticSteps: didactic.steps,
    fastOperations: counter.total,
    bruto: { status: bruto.status, steps: bruto.steps },
  };
}

/**
 * A series of races, one per garden size, each garden grown by `grow` (deterministic, e.g. from a
 * seeded generator): the points of the cost chart drawn in level 6.5 and analysed in Códex C11.
 */
export function benchmark(
  sizes: readonly number[],
  grow: (n: number) => Graph,
  brutoBudget: number,
): RaceResult[] {
  return sizes.map((n) => race(grow(n), brutoBudget));
}
