import { neighbors } from '../graph/queries';
import type { Graph } from '../graph/types';

/**
 * Number of perfect matchings of the graph: the ways to light every sprout at once. In chemistry
 * they are the Kekulé structures of a molecule, its double bonds placed so every carbon has exactly
 * one (Códex C14): benzene, a ring of six, has two.
 *
 * The recursion of `countMatchings` without its first choice: the lowest undecided sprout may not
 * stay dark, so it must share a lantern with a still-undecided neighbor. Memoized on the bigint
 * mask of decided sprouts, as there.
 */
export function countPerfectMatchings(graph: Graph): number {
  const memo = new Map<bigint, number>();
  const bit = (v: number): bigint => 1n << BigInt(v);
  const isDecided = (decided: bigint, v: number): boolean => (decided & bit(v)) !== 0n;

  const count = (decided: bigint): number => {
    let v = 0;
    while (v < graph.n && isDecided(decided, v)) v++;
    if (v === graph.n) return 1;

    const cached = memo.get(decided);
    if (cached !== undefined) return cached;

    // v must share a lantern now: every way to light the rest, for each partner it can take.
    const withV = decided | bit(v);
    let total = 0;
    for (const w of neighbors(graph, v)) {
      if (!isDecided(decided, w)) total += count(withV | bit(w));
    }
    memo.set(decided, total);
    return total;
  };

  return count(0n);
}
