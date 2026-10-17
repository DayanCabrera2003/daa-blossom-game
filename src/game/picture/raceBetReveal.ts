import { DOUBLING_ANSWERS } from '@core/cost/doubling';
import { itemAt } from '@core/shared/itemAt';
import type { LevelStep } from '@levels/flow';
import { doublingTextKey, raceBetVerdict } from '@levels/races';
import type { FlowAnswer } from '../systems/flow';

/**
 * What a race tells of a doubling bet it settles (GDD 6.5): right or wrong, the answer the races
 * gave, and the one picked when it was wrong. Guessing wrong is free (GDD §2, principle 5): the
 * text only puts the bet beside what was measured.
 */

/**
 * An interface text and its parameters, each parameter itself an interface text key (the runner,
 * the answers), so the scene translates them all.
 */
export interface RevealText {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
}

/** The interface text of a runner, as a key of `content/`. */
const runnerKey = (runner: string): string => `raceBet.runner.${runner}`;

/** What the race tells of the bet `answer` given at a step of `steps`; null if it is no bet. */
export function raceBetReveal(steps: readonly LevelStep[], answer: FlowAnswer): RevealText | null {
  const bet = steps[answer.step];
  const verdict = raceBetVerdict(steps, answer.step);
  if (bet?.step !== 'raceBet' || verdict === null) return null;
  const right = { runner: runnerKey(bet.runner), answer: doublingTextKey(verdict.answer) };
  if (answer.correct) return { key: 'raceBet.revealRight', params: right };
  const picked = doublingTextKey(itemAt(DOUBLING_ANSWERS, answer.value));
  return { key: 'raceBet.revealWrong', params: { ...right, bet: picked } };
}
