import type { Graph } from '../../graph/types';
import { size } from '../../matching/queries';
import type { Matching } from '../../matching/types';
import { fastEdmonds } from './solve';

/**
 * The optimum of each garden already asked about. Graphs are immutable and a level keeps one graph
 * for its whole play, so the optimum is computed once per level, not on every "Terminé" or hint.
 * Keyed weakly: a garden nobody holds any more takes its entry with it.
 */
const optimumOf = new WeakMap<Graph, number>();

/** The most lanterns the garden can hold, by fast Edmonds (an independent oracle from Bruto). */
export function maximumSize(graph: Graph): number {
  const known = optimumOf.get(graph);
  if (known !== undefined) return known;
  const optimum = size(fastEdmonds(graph));
  optimumOf.set(graph, optimum);
  return optimum;
}

/** Whether these lanterns are as many as the garden can hold: what a right "Terminé" claims. */
export const isMaximum = (graph: Graph, matching: Matching): boolean =>
  size(matching) === maximumSize(graph);
