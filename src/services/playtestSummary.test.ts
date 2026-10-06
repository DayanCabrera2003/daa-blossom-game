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

  it('an empty log has nothing to say', () => {
    expect(summarize(log([]))).toEqual([]);
  });
});
