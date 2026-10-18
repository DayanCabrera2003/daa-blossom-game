import { EMPTY_DESIGN, type Design } from '@levels/sandbox/design';
import { shareOf } from '@levels/sandbox/share';
import { describe, expect, it } from 'vitest';
import { importIntoHistory } from './designImport';
import { canUndo, current, startHistory, undo } from './history';

/** A path A–B–C with A=B lit. */
const SMALL: Design = {
  sprouts: [
    { label: 'A', x: 60, y: 100 },
    { label: 'B', x: 120, y: 100 },
    { label: 'C', x: 180, y: 100 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
  ],
  lanterns: [['A', 'B']],
};

describe('a garden opened from the share sheet', () => {
  it('becomes the design shown, after the one before so undo goes back to it', () => {
    const start = startHistory(EMPTY_DESIGN);
    const { history, answer } = importIntoHistory(start, shareOf(SMALL).json ?? '');
    expect(answer).toEqual({ ok: true });
    expect(current(history)).toEqual(SMALL);
    expect(canUndo(history)).toBe(true);
    expect(current(undo(history))).toEqual(EMPTY_DESIGN);
  });

  it('opens a garden code too, laid out anew', () => {
    const { history, answer } = importIntoHistory(
      startHistory(EMPTY_DESIGN),
      shareOf(SMALL).code ?? '',
    );
    expect(answer).toEqual({ ok: true });
    expect(shareOf(current(history)).code).toBe(shareOf(SMALL).code);
  });

  it('leaves the history as it was and answers why, for a text that is no garden', () => {
    const start = startHistory(SMALL);
    expect(importIntoHistory(start, '{"id": ')).toEqual({
      history: start,
      answer: { ok: false, reason: 'badJson' },
    });
    expect(importIntoHistory(start, 'not*a*code').answer).toEqual({ ok: false, reason: 'badCode' });
  });
});
