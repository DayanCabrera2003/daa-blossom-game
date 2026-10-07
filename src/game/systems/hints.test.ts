import { describe, expect, it } from 'vitest';
import {
  afterAccepted,
  afterRejected,
  HINT_DELAY_MS,
  isHintOffered,
  openHint,
  startHints,
} from './hints';

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

  it('progress starts the wait again and forgets the refusals', () => {
    const stuck = afterRejected(afterRejected(afterRejected(startHints(0))));
    const moving = afterAccepted(stuck, 50_000);
    expect(isHintOffered(moving, 50_001)).toBe(false);
    expect(isHintOffered(moving, 50_000 + HINT_DELAY_MS)).toBe(true);
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
