import type { Graph, VertexId } from '../graph/types';
import type { Matching } from '../matching/types';

/**
 * Explicit blossoms (Códex C7, C9). The game folds, unfolds, nests and rotates them, so a blossom
 * is first-class data rather than the `base[]` array trick of compact implementations.
 */

/** A vine between two specific sprouts, oriented: `[from, to]` (unlike `Edge`, not normalized). */
export type OrientedEdge = readonly [from: VertexId, to: VertexId];

/** A node of a folded garden: an original sprout, or a flower folding several nodes into one. */
export type GardenNode = SproutNode | Blossom;

/** A plain sprout of the original garden. */
export interface SproutNode {
  readonly kind: 'sprout';
  readonly vertex: VertexId;
}

/**
 * A flower: an odd cycle of 2k + 1 nodes holding k lanterns among themselves. `cycle[0]` is the
 * base, the only child whose lantern (if any) leaves the flower; going around, the lit pairs are
 * (cycle[1], cycle[2]), (cycle[3], cycle[4]), …, so both vines at the base are dark.
 *
 * `edges[i]` is the original vine joining a sprout of `cycle[i]` to a sprout of
 * `cycle[(i + 1) % length]`, in that orientation; it is what lets a flower be opened again.
 * Children may themselves be flowers: nesting is a tree whose leaves are sprouts.
 */
export interface Blossom {
  readonly kind: 'blossom';
  /** Unique within a folded garden; lets the game name the flowers in its "Layers" view. */
  readonly id: number;
  readonly cycle: readonly GardenNode[];
  readonly edges: readonly OrientedEdge[];
}

/**
 * A garden seen at some level of folding: the original graph G and, on top of it, the contracted
 * graph G/B₁/B₂/… with its matching M/B₁/B₂/…. Contracted ids are dense (`0..nodes.length-1`), so
 * the contracted garden is an ordinary `Graph` and every search tool works on it unchanged.
 */
export interface Layer {
  /** The original garden. */
  readonly original: Graph;
  /** The folded garden; vertex `i` stands for `nodes[i]`. */
  readonly graph: Graph;
  /** The lanterns of the folded garden. */
  readonly matching: Matching;
  /** What each folded vertex is: a sprout or a (possibly nested) flower. */
  readonly nodes: readonly GardenNode[];
  /** For each original sprout, the folded vertex that contains it. */
  readonly nodeOf: readonly VertexId[];
}
