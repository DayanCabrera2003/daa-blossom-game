import type { FlowState } from './flow';
import type { LevelSession } from './levelSession';

/**
 * The bets a won session won (GDD §5.1: a bet won gives seeds), named by level and step (`1.6#3`)
 * as the save keeps them: the formal bet answered right, and each doubling bet of a race answered
 * right. An informal bet (0.4) is a guess for fun and wins nothing; a question is no bet.
 */
export function betsWon(session: {
  readonly level: LevelSession['level'];
  readonly flow: Pick<FlowState, 'steps' | 'answers'>;
}): string[] {
  const { level, flow } = session;
  const won = flow.answers.filter((answer) => {
    const step = flow.steps[answer.step];
    const isBet = step?.step === 'raceBet' || (step?.step === 'bet' && !step.informal);
    return isBet && answer.correct;
  });
  return [...new Set(won.map((answer) => `${level.data.id}#${answer.step}`))];
}
