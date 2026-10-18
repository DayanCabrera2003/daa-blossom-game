import { DOUBLING_ANSWERS } from '@core/cost/doubling';
import { maximumSize } from '@core/edmonds/fast/maximum';
import type { VertexId } from '@core/graph/types';
import type { Matching } from '@core/matching/types';
import type { GardenState } from '@core/rules/state';
import { findConflict, isConflictVine } from '@core/search/conflict';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import type { CountStep } from '@levels/flow';
import { raceBetVerdict } from '@levels/races';
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

/**
 * Whether the vine u–v (original sprouts) is the one where the light went wrong (4.2): a conflict
 * of the player's search in the garden `state`.
 */
export const rightVine = (state: GardenState, u: VertexId, v: VertexId): boolean =>
  isConflictVine(state.layer, state.search, u, v);

/**
 * The right count of the winning threads (2.5): how many pieces of the tangle `yours ⊕ mirror` give
 * the reflection more lanterns than you. A loop always holds as many of each side, so they are all
 * threads; the core's decomposition measures what each one is worth.
 */
export const rightWinningThreads = (yours: Matching, mirror: Matching): number =>
  pondPieces(yours, mirror).filter((piece) => piece.gain > 0).length;

/** The right number of a `count` step, judged on the garden `state` as it is now. */
export function countAnswer(level: Level, state: GardenState, step: CountStep): number {
  if (step.of === 'loop') return rightLoopCount(state);
  // Level integrity gives every count on the tangle a reflection to count on.
  invariant(level.mirror !== null, 'a count on the tangle needs the reflection of its level');
  if (step.of === 'winningThreads') return rightWinningThreads(state.matching, level.mirror);
  return rightCount(state.matching, level.mirror, step);
}

/**
 * The right answer of the doubling bet at `step` of the script, as its index among the three
 * answers: what the core measured in the races around it. Null when that step is no doubling bet
 * with a race on each side (the level checks keep such a bet out of every level).
 */
export function rightRaceBet(level: Level, step: number): number | null {
  const verdict = raceBetVerdict(level.flow, step);
  return verdict === null ? null : DOUBLING_ANSWERS.indexOf(verdict.answer);
}
