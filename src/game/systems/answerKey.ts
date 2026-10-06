import { maximumSize } from '@core/edmonds/fast/maximum';
import type { VertexId } from '@core/graph/types';
import type { Matching } from '@core/matching/types';
import type { Level } from '@levels/build';
import { lanternsOn, pieceOf, pondPieces } from './pond';

/**
 * The right answers to the numeric questions of a script, as the core computes them from the
 * garden. They are never written by hand in a level file, so a question can never contradict its
 * garden (plan 03, §0).
 */

/** The right bet: the most lanterns the garden can hold. */
export const rightBet = (level: Level): number => maximumSize(level.graph);

/**
 * The right count: how many lanterns of one side (the player's, or the reflection's) lie on the
 * thread or loop of the tangle `yours ⊕ mirror` through the sprout `piece`; 0 when the sprout is on
 * no piece of the tangle (the level checks never let a count ask about one).
 */
export function rightCount(
  yours: Matching,
  mirror: Matching,
  question: { readonly piece: VertexId; readonly of: 'yours' | 'mirror' },
): number {
  const piece = pieceOf(pondPieces(yours, mirror), question.piece);
  return piece === null ? 0 : lanternsOn(piece, question.of);
}
