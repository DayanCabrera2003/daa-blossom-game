import type { Graph, VertexId } from '../graph/types';
import { isExposed, isMatchedEdge } from './queries';
import type { Matching } from './types';

/**
 * Every chain the player could drag (plan 10, section 2.3): each simple alternating path from a
 * sprout in the dark, with at least one vine, that ends either in the dark (it lights a lantern) or
 * right after a lit vine (a chain of gain 0). From every sprout in the dark in id order, depth
 * first, so the list is deterministic. Exponential in the worst case, which is fine for the small
 * gardens it is meant for: the mentor where a level's chain rule refuses some chains, and the tests
 * that walk every garden a level can reach.
 */
export function everyChain(graph: Graph, matching: Matching): VertexId[][] {
  const found: VertexId[][] = [];
  const extend = (path: VertexId[]): void => {
    const last = path[path.length - 1] as VertexId;
    // An odd number of sprouts means an even number of vines, the last one lit: a chain of gain 0.
    if (path.length > 1 && (path.length % 2 === 1 || isExposed(matching, last))) found.push(path);
    // Vines alternate dark, lit, dark…: the next one is lit exactly when the path has an even
    // number of sprouts.
    const nextLit = path.length % 2 === 0;
    for (const next of graph.adjacency[last] ?? []) {
      if (path.includes(next) || isMatchedEdge(matching, last, next) !== nextLit) continue;
      extend([...path, next]);
    }
  };
  for (let v = 0; v < graph.n; v++) if (isExposed(matching, v)) extend([v]);
  return found;
}
