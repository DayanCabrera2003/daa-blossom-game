import { describe, expect, it } from 'vitest';
import { exportLog } from './exportLog';
import { appendEntry, emptyLog } from './playtestLog';

const played = [
  { kind: 'levelStart', at: 1_000, level: '0.1' },
  { kind: 'claim', at: 2_000, level: '0.1', right: false },
  { kind: 'answer', at: 2_500, level: '0.1', step: 2, option: 1, right: false },
  { kind: 'levelEnd', at: 3_000, level: '0.1', outcome: 'won', stars: 3 },
] as const;
const log = played.reduce(appendEntry, emptyLog());

describe('exporting the playtest log', () => {
  it('names the file after the moment it was exported', () => {
    const exported = exportLog(log, Date.UTC(2026, 9, 6, 17, 5, 9));
    expect(exported.filename).toBe('florecer-playtest-2026-10-06T17-05-09.json');
    expect(exported.type).toBe('application/json');
  });

  it('carries the summary of each level, answers included, and the raw entries', () => {
    const exported = exportLog(log, Date.UTC(2026, 9, 6));
    expect(JSON.parse(exported.text)).toEqual({
      exportedAt: '2026-10-06T00:00:00.000Z',
      summary: [
        {
          level: '0.1',
          plays: 1,
          wins: 1,
          bestStars: 3,
          timeMs: 2_000,
          moves: 0,
          refusals: 0,
          hints: 0,
          claims: { right: 0, wrong: 1 },
          wrongAnswers: 1,
          bets: { made: 0, right: 0 },
          notebookWrong: 0,
          counterexamples: 0,
          mirrorChecks: { beating: 0, notBeating: 0 },
          vinePicks: { right: 0, wrong: 0 },
          flowerChains: { counted: 0, refused: 0 },
          firstPickRight: null,
          notebookRightFirstTry: null,
        },
      ],
      log,
    });
  });
});
