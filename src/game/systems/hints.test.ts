import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import {
  afterAccepted,
  afterMoved,
  afterRejected,
  HINT_DELAY_MS,
  isHintOffered,
  openHint,
  startHints as startHintsAt,
} from './hints';

/** The garden of 1.3 as it starts: three lanterns, Sami and Teo in the dark. */
const brigade = (() => {
  const level = catalog().find((l) => l.data.id === '1.3');
  if (level === undefined) throw new Error('no level 1.3');
  return level.start;
})();

/** The hint system as 1.3 starts at `now`. */
const startHints = (now: number) => startHintsAt(now, brigade);

/** The garden after `move` in `from`; a refused move is a broken test. */
function after(from: GardenState, move: Action): GardenState {
  const outcome = applyAction(from, move);
  if (!outcome.ok) throw new Error(`refused: ${outcome.reason.code}`);
  return outcome.state;
}

describe('when a hint is offered (GDD §5.3)', () => {
  it('not right away', () => {
    expect(isHintOffered(startHints(0), 1000)).toBe(false);
  });

  it('after 90 seconds without progress', () => {
    expect(isHintOffered(startHints(0), HINT_DELAY_MS - 1)).toBe(false);
    expect(isHintOffered(startHints(0), HINT_DELAY_MS)).toBe(true);
  });

  it('after three refused moves in a row', () => {
    const twice = afterRejected(afterRejected(startHints(0)));
    expect(isHintOffered(twice, 10)).toBe(false);
    expect(isHintOffered(afterRejected(twice), 10)).toBe(true);
  });

  it('a step that begins starts the wait again and forgets the refusals', () => {
    const stuck = afterRejected(afterRejected(afterRejected(startHints(0))));
    const moving = afterAccepted(stuck, brigade, 50_000);
    expect(isHintOffered(moving, 50_001)).toBe(false);
    expect(isHintOffered(moving, 50_000 + HINT_DELAY_MS)).toBe(true);
  });

  it('a move that beats the record starts the wait again and forgets the refusals', () => {
    const stuck = afterRejected(afterRejected(afterRejected(startHints(0))));
    const lit = after(brigade, { type: 'chain', path: [0, 1, 2, 3, 4, 5] });
    const moving = afterMoved(stuck, lit, 80_000);
    expect(isHintOffered(moving, 80_001)).toBe(false);
    expect(isHintOffered(moving, 80_000 + HINT_DELAY_MS)).toBe(true);
  });

  it('a move that only equals the record neither delays the offer nor breaks the refusals', () => {
    const split = after(brigade, { type: 'split', u: 3, v: 4 });
    const joined = after(split, { type: 'join', u: 3, v: 4 });
    const twice = afterRejected(afterRejected(startHints(0)));
    const looping = afterMoved(afterMoved(twice, split, 50_000), joined, 60_000);
    expect(isHintOffered(looping, HINT_DELAY_MS)).toBe(true);
    expect(isHintOffered(afterRejected(looping), 70_000)).toBe(true);
  });

  it('opening a hint gives the next grade and starts a new wait for the following one', () => {
    const opened = openHint(startHints(0), HINT_DELAY_MS);
    expect(opened?.grade).toBe(1);
    if (opened === null) return;
    expect(isHintOffered(opened.hints, HINT_DELAY_MS + 1)).toBe(false);
    expect(openHint(opened.hints, 2 * HINT_DELAY_MS)?.grade).toBe(2);
  });

  it('a hint that is not offered cannot be opened; grades stop at 3', () => {
    expect(openHint(startHints(0), 10)).toBeNull();
    let hints = startHints(0);
    const grades: number[] = [];
    for (let k = 1; k <= 5; k++) {
      const opened = openHint(hints, k * HINT_DELAY_MS);
      if (opened === null) break;
      grades.push(opened.grade);
      hints = opened.hints;
    }
    expect(grades).toEqual([1, 2, 3]);
    expect(isHintOffered(hints, 100 * HINT_DELAY_MS)).toBe(false);
  });
});
