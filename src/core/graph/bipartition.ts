import { neighbors } from './queries';
import type { Graph, VertexId } from './types';
import { itemAt } from '../shared/itemAt';

/**
 * Either a two-colouring (bees and flowers: every vine joins opposite sides) or an odd cycle
 * proving that none exists. A graph is bipartite if and only if it has no odd cycle (Códex C6);
 * returning the witness makes both directions of that statement observable.
 */
export type Bipartition =
  | { readonly kind: 'bipartite'; readonly side: readonly (0 | 1)[] }
  | { readonly kind: 'oddCycle'; readonly cycle: readonly VertexId[] };

/**
 * Breadth-first two-colouring. Each component is coloured from its smallest vertex, which gets
 * side 0, and a vertex's side is the parity of its BFS depth.
 *
 * If some edge joins two vertices of the same side, BFS depths of adjacent vertices differ by at
 * most one, so both endpoints sit at the same depth d. Walking up the BFS tree from each endpoint
 * to their lowest common ancestor at depth a gives two disjoint paths of length d − a, and the
 * edge closes a simple cycle of length 2(d − a) + 1: odd.
 */
export function bipartition(graph: Graph): Bipartition {
  const depth = new Array<number>(graph.n).fill(-1);
  const parent = new Array<VertexId>(graph.n).fill(-1);

  for (let root = 0; root < graph.n; root++) {
    if (depth[root] !== -1) continue;
    depth[root] = 0;
    const queue: VertexId[] = [root];

    for (let head = 0; head < queue.length; head++) {
      const u = itemAt(queue, head);
      for (const v of neighbors(graph, u)) {
        if (depth[v] === -1) {
          depth[v] = (depth[u] as number) + 1;
          parent[v] = u;
          queue.push(v);
        } else if (depth[v] === depth[u]) {
          return { kind: 'oddCycle', cycle: closeOddCycle(u, v, parent) };
        }
      }
    }
  }

  return { kind: 'bipartite', side: depth.map((d) => (d % 2) as 0 | 1) };
}

/**
 * Builds the odd cycle u → … → lca → … → v for two same-depth vertices joined by an edge.
 * Because both start at the same depth, stepping them up in lockstep meets exactly at the LCA.
 */
function closeOddCycle(u: VertexId, v: VertexId, parent: readonly VertexId[]): VertexId[] {
  const fromU: VertexId[] = [];
  const fromV: VertexId[] = [];
  let x = u;
  let y = v;
  while (x !== y) {
    fromU.push(x);
    fromV.push(y);
    x = itemAt(parent, x);
    y = itemAt(parent, y);
  }
  // x is now the lowest common ancestor.
  return [...fromU, x, ...fromV.reverse()];
}
