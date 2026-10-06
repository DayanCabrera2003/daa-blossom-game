import { connectedComponents } from '../graph/components';
import type { Graph, VertexId } from '../graph/types';

/**
 * The odd groups of G − U: connected components with an odd number of sprouts once the stones U
 * are lifted (chapter 7). An odd group cannot pair up all its sprouts among themselves, so each
 * one leaves a sprout in the dark or lit by a stone: the heart of the Tutte–Berge bound (Códex C12).
 * Components come in the canonical order of `connectedComponents`.
 */
export function oddComponents(graph: Graph, stones: readonly VertexId[]): VertexId[][] {
  return connectedComponents(graph, new Set(stones)).filter((group) => group.length % 2 === 1);
}
