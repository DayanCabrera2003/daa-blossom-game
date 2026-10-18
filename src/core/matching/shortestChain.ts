import type { Graph, VertexId } from '../graph/types';
import { isExposed, isMatchedEdge } from './queries';
import type { Matching } from './types';

/**
 * A shortest augmenting path (winning chain), or null when the matching is already maximum
 * (Berge, Códex C3). Passing the first lantern of a shortest chain of length L leaves a chain of
 * length L − 2, so a player who only joins and passes lanterns (chapter 1) gets strictly closer to
 * one more lantern each step; any other chain may be undone by the next one found.
 *
 * Iterative deepening over simple alternating paths: lengths 1, 3, 5… from every sprout in the
 * dark, in id order, so the answer is deterministic. The search is exponential in the worst case,
 * which is fine for the small gardens it is meant for; the full algorithm is `core/edmonds`.
 */
export function shortestChain(graph: Graph, matching: Matching): VertexId[] | null {
  const roots = [...Array(graph.n).keys()].filter((v) => isExposed(matching, v));
  for (let length = 1; length < graph.n; length += 2) {
    for (const root of roots) {
      const found = extend(graph, matching, [root], length);
      if (found !== null) return found;
    }
  }
  return null;
}

/**
 * Extends the alternating `path` by exactly `remaining` vines to a sprout in the dark. Vines
 * alternate dark, lit, dark…: the next vine is lit exactly when the path has an even number of
 * vines past its first one, i.e. when its vertex count is even.
 */
function extend(
  graph: Graph,
  matching: Matching,
  path: VertexId[],
  remaining: number,
): VertexId[] | null {
  const last = path[path.length - 1] as VertexId;
  if (remaining === 0) return isExposed(matching, last) && path.length > 1 ? path : null;
  const nextLit = path.length % 2 === 0;
  for (const next of graph.adjacency[last] ?? []) {
    if (path.includes(next) || isMatchedEdge(matching, last, next) !== nextLit) continue;
    const found = extend(graph, matching, [...path, next], remaining - 1);
    if (found !== null) return found;
  }
  return null;
}
