import { maximumSize } from '@core/edmonds/fast/maximum';
import type { VertexId } from '@core/graph/types';
import type { Matching } from '@core/matching/types';
import type { GardenState } from '@core/rules/state';
import { findConflict } from '@core/search/conflict';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import type { CountStep } from '@levels/flow';
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

/**
 * The right count of the loop (4.2): how many sprouts the loop closed by the conflict of the
 * player's search holds; 0 when the search meets no conflict (the level checks never let a count of
 * the loop come where it does not).
 */
export const rightLoopCount = (state: GardenState): number =>
  findConflict(state.layer, state.search)?.sprouts ?? 0;

/** The right number of a `count` step, judged on the garden `state` as it is now. */
export function countAnswer(level: Level, state: GardenState, step: CountStep): number {
  if (step.of === 'loop') return rightLoopCount(state);
  // Level integrity gives every count of lanterns a reflection to count on.
  invariant(level.mirror !== null, 'a count of lanterns needs the reflection of its level');
  return rightCount(state.matching, level.mirror, step);
}
