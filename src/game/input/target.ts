import type { VertexId } from '@core/graph/types';

/** A point on the 480×270 canvas, in canvas pixels (the coordinates of level files). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * What lies under the pointer, as the game understands it: a sprout, a vine (always as its two
 * original sprouts), a folded flower on top (by its id), or nothing worth reacting to.
 */
export type Target =
  | { readonly kind: 'sprout'; readonly vertex: VertexId }
  | { readonly kind: 'vine'; readonly u: VertexId; readonly v: VertexId }
  | { readonly kind: 'flower'; readonly blossom: number }
  | { readonly kind: 'nothing' };
