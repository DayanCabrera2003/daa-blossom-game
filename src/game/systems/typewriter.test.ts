import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SPEAKERS } from './speaker';
import { PACES, revealTimes, visibleCount, type Pace } from './typewriter';

/** A pace with round numbers: one character every 100 ms, pauses of 50 and 200 ms. */
const ROUND: Pace = { lettersPerSecond: 10, commaPause: 50, stopPause: 200 };

describe('when each character of a line appears', () => {
  it('shows the first character at once and the rest at the speaker’s rate', () => {
    expect(revealTimes('abc d', ROUND)).toEqual([0, 100, 200, 300, 400]);
  });

  it('waits a short pause after a comma and a long one after the end of a sentence', () => {
    expect(revealTimes('a, b. c', ROUND)).toEqual([0, 100, 250, 350, 450, 750, 850]);
    expect(revealTimes('¿sí? ¡no!', ROUND)).toEqual([0, 100, 200, 300, 600, 700, 800, 900, 1000]);
    expect(revealTimes('ya… no', ROUND)).toEqual([0, 100, 200, 500, 600, 700]);
  });

  it('pauses once after a run of marks, not after each of them', () => {
    expect(revealTimes('no... ¿sí?! y', ROUND)).toEqual([
      0, 100, 200, 300, 400, 700, 800, 900, 1000, 1100, 1200, 1500, 1600,
    ]);
  });

  it('counts a character outside the basic plane as one', () => {
    expect(revealTimes('a😀b', ROUND)).toEqual([0, 100, 200]);
  });

  it('gives nothing for an empty line', () => {
    expect(revealTimes('', ROUND)).toEqual([]);
  });

  it('never shows a character before the one ahead of it', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), fc.constantFrom(...SPEAKERS), (text, speaker) => {
        const times = revealTimes(text, PACES[speaker]);
        expect(times).toHaveLength(Array.from(text).length);
        times.slice(1).forEach((time, i) => expect(time).toBeGreaterThan(times[i] ?? Infinity));
      }),
    );
  });
});

describe('the pace of each speaker', () => {
  it('follows the table of the babble: the mentor calm, the gnome hurried, the oaks slow', () => {
    expect(PACES.sauce).toEqual({ lettersPerSecond: 24, commaPause: 120, stopPause: 300 });
    expect(PACES.bruto).toEqual({ lettersPerSecond: 40, commaPause: 60, stopPause: 120 });
    expect(PACES.oaks).toEqual({ lettersPerSecond: 16, commaPause: 250, stopPause: 500 });
  });

  it('types the gardener’s answers and the notebook too, though neither babbles', () => {
    expect(PACES.gardener.lettersPerSecond).toBeGreaterThan(0);
    expect(PACES.notebook.lettersPerSecond).toBeGreaterThan(0);
  });
});

describe('what the box shows after some time', () => {
  const times = revealTimes('hola', ROUND);

  it('shows as many characters as have appeared', () => {
    expect(visibleCount(times, -1)).toBe(0);
    expect(visibleCount(times, 0)).toBe(1);
    expect(visibleCount(times, 150)).toBe(2);
    expect(visibleCount(times, 300)).toBe(4);
    expect(visibleCount(times, Infinity)).toBe(4);
  });
});
