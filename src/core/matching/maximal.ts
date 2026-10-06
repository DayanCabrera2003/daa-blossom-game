import type { Edge, Graph } from '../graph/types';
import type { Matching } from './types';
import { isExposed } from './queries';

/**
 * Vines whose two sprouts are both in the dark: the only places a lantern can be lit directly.
 * Listed in the graph's canonical edge order.
 */
export function freeEdges(graph: Graph, matching: Matching): Edge[] {
  return graph.edges.filter(([u, v]) => isExposed(matching, u) && isExposed(matching, v));
}

/**
 * Maximal: no lantern can be added without moving another. Level 1.1 exists to show that this is
 * weaker than maximum: a maximal matching can be stuck below the best size.
 */
export function isMaximal(graph: Graph, matching: Matching): boolean {
  return freeEdges(graph, matching).length === 0;
}
