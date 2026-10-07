import { describe, expect, it } from 'vitest';
import type { PlaytestEntry } from './playtestLog';
import { summarize } from './playtestSummary';

const log = (entries: PlaytestEntry[]) => ({ version: 1 as const, entries });

describe('playtest summary', () => {
  it('rebuilds time, hints, refusals and claims of a level from its entries', () => {
    const [first] = summarize(
      log([
        { kind: 'sessionStart', at: 0 },
        { kind: 'levelStart', at: 1_000, level: '1.1' },
        { kind: 'refused', at: 2_000, level: '1.1', action: 'join', reason: 'alreadyLit' },
        { kind: 'hint', at: 3_000, level: '1.1', grade: 1 },
        { kind: 'claim', at: 4_000, level: '1.1', right: false },
        { kind: 'move', at: 5_000, level: '1.1', action: 'passLantern' },
        { kind: 'claim', at: 6_000, level: '1.1', right: true },
        { kind: 'levelEnd', at: 7_000, level: '1.1', outcome: 'won', stars: 2 },
      ]),
    );
    expect(first).toEqual({
      level: '1.1',
      plays: 1,
      wins: 1,
      bestStars: 2,
      timeMs: 6_000,
      moves: 1,
      refusals: 1,
      hints: 1,
      claims: { right: 1, wrong: 1 },
      wrongAnswers: 0,
      bets: { made: 0, right: 0 },
      notebookWrong: 0,
      counterexamples: 0,
      mirrorChecks: { beating: 0, notBeating: 0 },
      vinePicks: { right: 0, wrong: 0 },
      flowerChains: { counted: 0, refused: 0 },
    });
  });

  it('adds up every play of a level, a left one included, and keeps the best stars', () => {
    const [summary] = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '0.1' },
        { kind: 'levelEnd', at: 500, level: '0.1', outcome: 'left', stars: null },
        { kind: 'levelStart', at: 1_000, level: '0.1' },
        { kind: 'levelEnd', at: 3_000, level: '0.1', outcome: 'won', stars: 3 },
        { kind: 'levelStart', at: 4_000, level: '0.1' },
        { kind: 'levelEnd', at: 4_100, level: '0.1', outcome: 'won', stars: 1 },
      ]),
    );
    expect(summary).toMatchObject({ plays: 3, wins: 2, bestStars: 3, timeMs: 2_600 });
  });

  it('a play cut short (page closed) counts until its last entry', () => {
    const [summary] = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '4.1' },
        { kind: 'move', at: 800, level: '4.1', action: 'markRoot' },
        { kind: 'sessionStart', at: 90_000 },
        { kind: 'levelStart', at: 91_000, level: '4.1' },
        { kind: 'history', at: 91_500, level: '4.1', move: 'undo' },
      ]),
    );
    expect(summary).toMatchObject({ plays: 2, wins: 0, bestStars: null, timeMs: 800 + 500 });
  });

  it('entries with no play open still count, but add no time', () => {
    const [summary] = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '7.2' },
        { kind: 'sessionStart', at: 50 },
        { kind: 'move', at: 55, level: '7.2', action: 'liftStone' },
        { kind: 'levelEnd', at: 60, level: '7.2', outcome: 'won', stars: null },
      ]),
    );
    expect(summary).toMatchObject({ plays: 1, wins: 1, bestStars: 0, timeMs: 0, moves: 1 });
  });

  it('lists levels in the order they were first played', () => {
    const summaries = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '4.6' },
        { kind: 'levelStart', at: 10, level: '0.1' },
        { kind: 'levelStart', at: 20, level: '4.6' },
      ]),
    );
    expect(summaries.map((summary) => summary.level)).toEqual(['4.6', '0.1']);
  });

  it('rebuilds, per level, the wrong answers and the bets made and right', () => {
    const summaries = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '1.2' },
        { kind: 'answer', at: 1, level: '1.2', step: 1, option: 0, right: false },
        { kind: 'answer', at: 2, level: '1.2', step: 1, option: 2, right: false },
        { kind: 'answer', at: 3, level: '1.2', step: 1, option: 1, right: true },
        { kind: 'levelEnd', at: 4, level: '1.2', outcome: 'won', stars: 3 },
        { kind: 'levelStart', at: 10, level: '1.6' },
        { kind: 'bet', at: 11, level: '1.6', value: 3, right: false, informal: false },
        { kind: 'levelEnd', at: 12, level: '1.6', outcome: 'left', stars: null },
        { kind: 'levelStart', at: 20, level: '1.6' },
        { kind: 'bet', at: 21, level: '1.6', value: 4, right: true, informal: false },
        { kind: 'answer', at: 22, level: '1.6', step: 4, option: 2, right: true },
      ]),
    );
    expect(
      summaries.map(({ level, wrongAnswers, bets }) => ({ level, wrongAnswers, bets })),
    ).toEqual([
      { level: '1.2', wrongAnswers: 2, bets: { made: 0, right: 0 } },
      { level: '1.6', wrongAnswers: 0, bets: { made: 2, right: 1 } },
    ]);
  });

  it('counts the vines pointed at per level, right and wrong (4.2)', () => {
    const [summary] = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '4.2' },
        { kind: 'pickVine', at: 1, level: '4.2', step: 1, vine: ['b', 'c'], right: false },
        { kind: 'pickVine', at: 2, level: '4.2', step: 1, vine: ['b', 'd'], right: true },
      ]),
    );
    expect(summary?.vinePicks).toEqual({ right: 1, wrong: 1 });
  });

  it('counts the chains drawn in the flower challenge per level, counted and refused (4.11)', () => {
    const [summary] = summarize(
      log([
        { kind: 'levelStart', at: 0, level: '4.11' },
        { kind: 'flowerChain', at: 1, level: '4.11', path: ['t', 'x'], counted: false },
        { kind: 'flowerChain', at: 2, level: '4.11', path: ['e', 't'], counted: true },
      ]),
    );
    expect(summary?.flowerChains).toEqual({ counted: 1, refused: 1 });
  });

  it('counts wrong notebook choices, counterexamples opened and mirror checks per level', () => {
    const [notebook, mirror] = summarize(
      log([
        { kind: 'notebook', at: 0, level: '1.9', option: 0, right: false },
        { kind: 'counterexample', at: 1, level: '1.9', option: 0 },
        { kind: 'notebook', at: 2, level: '1.9', option: 1, right: false },
        { kind: 'notebook', at: 3, level: '1.9', option: 2, right: true },
        { kind: 'mirrorCheck', at: 4, level: '2.4', beats: false, counted: false },
        { kind: 'mirrorCheck', at: 5, level: '2.4', beats: true, counted: true },
        { kind: 'mirrorCheck', at: 6, level: '2.4', beats: true, counted: false },
      ]),
    );
    expect(notebook).toMatchObject({ level: '1.9', notebookWrong: 2, counterexamples: 1 });
    expect(mirror).toMatchObject({ level: '2.4', mirrorChecks: { beating: 2, notBeating: 1 } });
  });

  it('an empty log has nothing to say', () => {
    expect(summarize(log([]))).toEqual([]);
  });
});
