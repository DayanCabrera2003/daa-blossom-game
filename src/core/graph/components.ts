import { invariant } from '../shared/invariant';
import { neighbors } from './queries';
import type { Graph, VertexId } from './types';

/**
 * Connected components of the graph after deleting the vertices in `removed`.
 *
 * Deleting vertices is what "lifting stones" does in chapter 7: the Tutte–Berge bound counts the
 * odd components of G − U, so this function is the ground truth that certificate checks rely on.
 *
 * Each component lists its vertices in ascending order, and components are ordered by their
 * smallest vertex, so the output is canonical and can be compared directly.
 */
export function connectedComponents(
  graph: Graph,
  removed: ReadonlySet<VertexId> = new Set(),
): VertexId[][] {
  for (const v of removed) {
    invariant(
      Number.isInteger(v) && v >= 0 && v < graph.n,
      `removed vertex ${v} is not in the graph`,
    );
  }

  const visited = new Array<boolean>(graph.n).fill(false);
  const components: VertexId[][] = [];

  // Scanning start vertices in ascending order yields components already sorted by minimum.
  for (let start = 0; start < graph.n; start++) {
    if (visited[start] || removed.has(start)) continue;

    const component: VertexId[] = [];
    const stack: VertexId[] = [start];
    visited[start] = true;
    while (stack.length > 0) {
      const u = stack.pop() as VertexId;
      component.push(u);
      for (const w of neighbors(graph, u)) {
        if (!visited[w] && !removed.has(w)) {
          visited[w] = true;
          stack.push(w);
        }
      }
    }
    components.push(component.sort((a, b) => a - b));
  }

  return components;
}
