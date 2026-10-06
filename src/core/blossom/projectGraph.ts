import { createGraph } from '../graph/createGraph';
import type { Edge, Graph, VertexId } from '../graph/types';
import { unwrap } from '../shared/result';

/**
 * The folded garden seen through a renaming of vertices into `n` nodes: every vine is carried over
 * to the nodes of its ends, vines inside one node vanish and parallel vines merge into one. This
 * is the quotient G/B that both folding and unfolding build.
 */
export function projectGraph(
  edges: readonly Edge[],
  n: number,
  rename: (v: VertexId) => VertexId,
): Graph {
  const seen = new Set<string>();
  const projected: Edge[] = [];
  for (const [u, v] of edges) {
    const [a, b] = [rename(u), rename(v)];
    const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (a === b || seen.has(key)) continue;
    seen.add(key);
    projected.push([a, b]);
  }
  return unwrap(createGraph(n, projected));
}
