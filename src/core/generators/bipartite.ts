import { createGraph } from '../graph/createGraph';
import type { Edge, Graph } from '../graph/types';
import { invariant } from '../shared/invariant';
import { unwrap } from '../shared/result';
import type { Rng } from '../shared/rng';

/**
 * A random garden of bees and flowers: `a` bees (sprouts `0..a-1`) and `b` flowers (sprouts
 * `a..a+b-1`), where each of the a·b possible vines between a bee and a flower grows independently
 * with probability p, and no vine ever joins two of the same kind. Every such garden is bipartite
 * by construction, so the free mode can offer it König's scarecrows. All randomness comes from the
 * given seeded generator, so the same seed always grows the same garden.
 */
export function randomBipartiteGraph(a: number, b: number, p: number, rng: Rng): Graph {
  invariant(
    Number.isInteger(a) && a >= 0,
    `number of bees must be a non-negative integer, got ${a}`,
  );
  invariant(
    Number.isInteger(b) && b >= 0,
    `number of flowers must be a non-negative integer, got ${b}`,
  );
  invariant(p >= 0 && p <= 1, `vine probability must be in [0, 1], got ${p}`);
  const edges: Edge[] = [];
  for (let bee = 0; bee < a; bee++) {
    for (let flower = a; flower < a + b; flower++) if (rng.next() < p) edges.push([bee, flower]);
  }
  return unwrap(createGraph(a + b, edges));
}
