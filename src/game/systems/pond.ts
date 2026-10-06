import type { Edge, VertexId } from '@core/graph/types';
import { isMatchedEdge } from '@core/matching/queries';
import { decomposeSymmetricDifference } from '@core/matching/symmetricDifference';
import { UNMATCHED, type Matching } from '@core/matching/types';

/**
 * The Mirror Pond (chapter 2, plan 03 phase 7): the player's lanterns against the reflection's, and
 * the tangle of the vines lit on exactly one side (`yours ⊕ mirror`). Pure; the pieces come from the
 * core's decomposition (Berge's lemma), never recomputed here. In this file a `strand` is one vine
 * of the tangle and a `piece` a whole thread (path) or loop (cycle) of it.
 */

/** Which side lights a strand: the player's garden or the reflection. */
export type Side = 'yours' | 'mirror';

/** One vine of the tangle, lit on one side only. */
export interface Strand {
  readonly u: VertexId;
  readonly v: VertexId;
  readonly side: Side;
}

/** A whole thread or loop of the tangle, with its strands in order along it. */
export interface Piece {
  readonly kind: 'thread' | 'loop';
  /** In the core's order: a thread from its smaller end, a loop from its smallest sprout. */
  readonly sprouts: readonly VertexId[];
  readonly strands: readonly Strand[];
  /** Lanterns of the reflection minus yours on this piece: what turning it over is worth. */
  readonly gain: number;
}

/** The threads and loops of the tangle `yours ⊕ mirror`; the pairs lit on both sides are left out. */
export function pondPieces(yours: Matching, mirror: Matching): Piece[] {
  return decomposeSymmetricDifference(yours, mirror).map((component) => ({
    kind: component.kind === 'path' ? 'thread' : 'loop',
    sprouts: component.vertices,
    strands: component.edges.map(([u, v]) => ({
      u,
      v,
      side: isMatchedEdge(yours, u, v) ? 'yours' : 'mirror',
    })),
    gain: component.gain,
  }));
}

/** The piece through `sprout`, or null when the sprout is not in the tangle. */
export const pieceOf = (pieces: readonly Piece[], sprout: VertexId): Piece | null =>
  pieces.find((piece) => piece.sprouts.includes(sprout)) ?? null;

/** How many lanterns of one side lie on a piece. */
export const lanternsOn = (piece: Piece, side: Side): number =>
  piece.strands.filter((strand) => strand.side === side).length;

/**
 * How many strands of the tangle meet at `sprout` (what 2.1 calls its threads): at most one of
 * yours and one of the reflection's, since each side gives a sprout at most one lantern, so 0, 1
 * or 2. A pair lit on both sides is no strand.
 */
export function degreeIn(yours: Matching, mirror: Matching, sprout: VertexId): number {
  const mine = yours.mate[sprout] ?? UNMATCHED;
  const theirs = mirror.mate[sprout] ?? UNMATCHED;
  if (mine === theirs) return 0;
  return (mine === UNMATCHED ? 0 : 1) + (theirs === UNMATCHED ? 0 : 1);
}

/** The vines lit on both sides: they fade from the picture and are in no piece. */
export function sharedPairs(yours: Matching, mirror: Matching): Edge[] {
  const pairs: Edge[] = [];
  yours.mate.forEach((partner, v) => {
    if (partner !== UNMATCHED && v < partner && mirror.mate[v] === partner)
      pairs.push([v, partner]);
  });
  return pairs;
}

/**
 * The first thread on which the reflection holds more lanterns than you (2.3), or null when none
 * does. It starts and ends with a lantern of the reflection, so both its ends are dark in your
 * garden: it is a chain of yours, and the core's order already starts it at one of them.
 */
export const winningPiece = (yours: Matching, mirror: Matching): Piece | null =>
  pondPieces(yours, mirror).find((piece) => piece.gain > 0) ?? null;
