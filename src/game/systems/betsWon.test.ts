import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { betsWon } from './betsWon';
import { startFlow, type FlowAnswer } from './flow';

/** The level `id` of the catalog, with its script already answered with `answers`. */
function played(id: string, answers: (step: number) => FlowAnswer | null) {
  const level = catalog().find((each) => each.data.id === id);
  if (level === undefined) throw new Error(`the catalog has no level ${id}`);
  const { flow } = startFlow(level.flow, { notebook: [] });
  const given = level.flow.flatMap((_, step) => answers(step) ?? []);
  return { level, flow: { ...flow, answers: given } };
}

/** The steps of a level's script of kind `kind`, by index. */
const stepsOf = (id: string, kind: string): number[] =>
  (catalog().find((level) => level.data.id === id)?.flow ?? []).flatMap((step, index) =>
    step.step === kind ? [index] : [],
  );

describe('the bets a won session won', () => {
  it('the formal bet of 1.6, when right, by level and step', () => {
    const [bet] = stepsOf('1.6', 'bet');
    if (bet === undefined) throw new Error('1.6 bets');
    const right = played('1.6', (step) =>
      step === bet ? { step, value: 4, correct: true } : null,
    );
    expect(betsWon(right)).toEqual([`1.6#${bet}`]);
    const wrong = played('1.6', (step) =>
      step === bet ? { step, value: 2, correct: false } : null,
    );
    expect(betsWon(wrong)).toEqual([]);
  });

  it('the informal bet of 0.4 gives nothing, even when right', () => {
    const [bet] = stepsOf('0.4', 'bet');
    const right = played('0.4', (step) =>
      step === bet ? { step, value: 2, correct: true } : null,
    );
    expect(betsWon(right)).toEqual([]);
  });

  it('each doubling bet of 6.5 answered right: two of four give two', () => {
    const bets = stepsOf('6.5', 'raceBet');
    expect(bets).toHaveLength(4);
    const wrong = new Set([bets[1], bets[3]]);
    const session = played('6.5', (step) =>
      bets.includes(step) ? { step, value: 0, correct: !wrong.has(step) } : null,
    );
    expect(betsWon(session)).toEqual(
      bets.filter((step) => !wrong.has(step)).map((step) => `6.5#${step}`),
    );
  });

  it('a question answered right is no bet', () => {
    const [ask] = stepsOf('6.4', 'ask');
    if (ask === undefined) throw new Error('6.4 asks');
    const session = played('6.4', (step) =>
      step === ask ? { step, value: 0, correct: true } : null,
    );
    expect(betsWon(session)).toEqual([]);
  });
});
