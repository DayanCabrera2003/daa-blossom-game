import { neighbors } from '../graph/queries';
import type { Graph } from '../graph/types';

/**
 * Number of matchings of the graph, the empty one included: how many combinations Bruto would
 * have to try. It grows exponentially (Fibonacci on paths, the telephone numbers on complete
 * graphs), which is the curve of Códex C11 that the efficient algorithm escapes.
 *
 * Same recursion as the brute-force search (the lowest undecided sprout stays dark or pairs with a
 * free neighbor) but memoized on the set of decided sprouts, so counting stays fast even where
 * enumerating would not. The set is a bigint bitmask so any graph size works.
 */
export function countMatchings(graph: Graph): number {
  const memo = new Map<bigint, number>();
  const bit = (v: number): bigint => 1n << BigInt(v);
  const isDecided = (decided: bigint, v: number): boolean => (decided & bit(v)) !== 0n;

  const count = (decided: bigint): number => {
    let v = 0;
    while (v < graph.n && isDecided(decided, v)) v++;
    if (v === graph.n) return 1;

    const cached = memo.get(decided);
    if (cached !== undefined) return cached;

    const withV = decided | bit(v);
    // Either v stays in the dark, or it shares a lantern with a still-undecided neighbor.
    let total = count(withV);
    for (const w of neighbors(graph, v)) {
      if (!isDecided(decided, w)) total += count(withV | bit(w));
    }
    memo.set(decided, total);
    return total;
  };

  return count(0n);
}
