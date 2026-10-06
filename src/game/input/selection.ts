import type { VertexId } from '@core/graph/types';

/**
 * What the player has started to point at, between touches: one sprout (the first of a two-touch
 * move, like joining or looking from a sun), or the sprouts of a loop being chosen for folding.
 */
export type Selection =
  | { readonly kind: 'none' }
  | { readonly kind: 'sprout'; readonly vertex: VertexId }
  | { readonly kind: 'loop'; readonly vertices: readonly VertexId[] };

/** Nothing selected. */
export const NO_SELECTION: Selection = { kind: 'none' };
