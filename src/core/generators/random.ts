import { createGraph } from '../graph/createGraph';
import type { Edge, Graph } from '../graph/types';
import { invariant } from '../shared/invariant';
import { unwrap } from '../shared/result';
import type { Rng } from '../shared/rng';

/**
 * A random garden G(n, p): each of the n(n − 1)/2 possible vines grows independently with
 * probability p. All randomness comes from the given seeded generator, so a race garden, a sandbox
 * garden or a failing test case can always be grown again from its seed.
 */
export function randomGraph(n: number, p: number, rng: Rng): Graph {
  invariant(Number.isInteger(n) && n >= 0, `garden size must be a non-negative integer, got ${n}`);
  invariant(p >= 0 && p <= 1, `vine probability must be in [0, 1], got ${p}`);
  const edges: Edge[] = [];
  for (let u = 0; u < n; u++) {
    for (let v = u + 1; v < n; v++) if (rng.next() < p) edges.push([u, v]);
  }
  return unwrap(createGraph(n, edges));
}
