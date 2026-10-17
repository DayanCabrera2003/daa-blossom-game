import { invariant } from '../shared/invariant';
import type { Run } from './benchmark';

/**
 * The bets of race II (GDD 6.5, plan 05 phase 4): "si el jardín se duplica, ¿cuántos pasos más
 * dará tu receta? ¿Y Bruto?". The player never guesses a number, only one of three answers, and
 * the right one comes from the steps measured in the two races, never from theory:
 * - `double`: about twice the steps;
 * - `fourToEight`: from about four to about eight times the steps;
 * - `farMore`: far more than that, or the runner fell asleep.
 *
 * The answers are read on a logarithmic scale, where doubling the steps is one unit: each answer
 * covers the ratios nearer to it than to its neighbours (√2 to √8 for double, √8 to √128 for four
 * to eight, beyond √128 for far more). A ratio within a fixed tolerance of an edge is still given
 * its answer, but is not `clear`: a level must race gardens whose answers are clear, so a player
 * is never told wrong for picking the neighbour of a ratio that sits between two.
 */

/** The answers of a doubling bet, from the gentlest growth to the wildest. */
export const DOUBLING_ANSWERS = ['double', 'fourToEight', 'farMore'] as const;

/** One answer of a doubling bet. */
export type DoublingAnswer = (typeof DOUBLING_ANSWERS)[number];

/** The right answer of a bet, and whether the measured ratio lies clearly inside it. */
export interface DoublingVerdict {
  readonly answer: DoublingAnswer;
  readonly clear: boolean;
}

/** Where `double` begins and ends, and where `farMore` begins, in doublings of the steps. */
const DOUBLE_FROM = 0.5;
const FOUR_FROM = 1.5;
const FAR_FROM = 3.5;
/** How far from every edge a clear ratio lies, in doublings (a factor of 2^¼ ≈ 1.19). */
const TOLERANCE = 0.25;

/**
 * The right answer of a doubling bet for one runner, from his run in the smaller garden and in the
 * one twice its size. Falling asleep in the bigger garden is `farMore`, clearly: he did not even
 * finish. Waking up in the bigger garden after sleeping in the smaller one leaves no ratio to read.
 */
export function doublingAnswer(before: Run, after: Run): DoublingVerdict {
  if (after.asleep) return { answer: 'farMore', clear: true };
  if (before.asleep) return { answer: 'farMore', clear: false };
  invariant(before.steps > 0, 'a race of no steps has nothing to compare with');
  const doublings = Math.log2(after.steps / before.steps);
  const answer: DoublingAnswer =
    doublings < FOUR_FROM ? 'double' : doublings <= FAR_FROM ? 'fourToEight' : 'farMore';
  const edges = [DOUBLE_FROM, FOUR_FROM, FAR_FROM];
  const clear =
    doublings >= DOUBLE_FROM && edges.every((edge) => Math.abs(doublings - edge) >= TOLERANCE);
  return { answer, clear };
}
