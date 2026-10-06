/**
 * Graph model shared by the whole core. Vertices are dense integer ids `0..n-1`; the sprout
 * names a level shows (`R`, `a`, `b`, …) are labels layered on top (see labels.ts), never identity.
 */

/** A vertex (a sprout in the garden). */
export type VertexId = number;

/** An undirected edge (a vine), always stored normalized with the smaller endpoint first. */
export type Edge = readonly [VertexId, VertexId];

/**
 * A simple undirected graph: no self-loops, no parallel edges. Instances are only built by
 * `createGraph`, which validates and normalizes, so every consumer can rely on these invariants:
 * - `edges` are normalized (`u < v`) and sorted lexicographically;
 * - `adjacency[v]` lists the neighbors of `v` in ascending order.
 * Sorted order makes every traversal, and therefore every trace, deterministic.
 */
export interface Graph {
  readonly n: number;
  readonly edges: readonly Edge[];
  readonly adjacency: readonly (readonly VertexId[])[];
}
