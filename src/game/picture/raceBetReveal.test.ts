import { describe, expect, it } from 'vitest';
import { racesLevel } from '../../../tests/support/fixtureLevels';
import { raceBetReveal } from './raceBetReveal';

// The automaton goes from 41 steps at 8 sprouts to 183 at 16; Bruto falls asleep at 16.
const { flow } = racesLevel();

describe('what a race tells of the doubling bets it settles (6.5)', () => {
  it('a right bet is told right, with the answer the races gave', () => {
    expect(raceBetReveal(flow, { step: 1, value: 1, correct: true })).toEqual({
      key: 'raceBet.revealRight',
      params: { runner: 'raceBet.runner.automaton', answer: 'raceBet.answer.fourToEight' },
    });
  });

  it('a wrong bet is told with the answer picked and the one the races gave', () => {
    expect(raceBetReveal(flow, { step: 2, value: 0, correct: false })).toEqual({
      key: 'raceBet.revealWrong',
      params: {
        runner: 'raceBet.runner.bruto',
        answer: 'raceBet.answer.farMore',
        bet: 'raceBet.answer.double',
      },
    });
  });

  it('tells nothing of a step that is no doubling bet', () => {
    expect(raceBetReveal(flow, { step: 0, value: 0, correct: false })).toBeNull();
  });
});
