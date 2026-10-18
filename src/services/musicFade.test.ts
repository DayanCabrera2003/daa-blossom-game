import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CROSSFADE_MS,
  DUCK_LEVEL,
  DUCK_MS,
  UNDUCK_MS,
  duckLevel,
  startDuck,
  trackFaded,
  trackLevel,
} from './musicFade';

const time = fc.double({ min: 0, max: 10_000, noNaN: true });

describe('the crossfade of two tracks', () => {
  it('a new track rises from silence to full over the crossfade', () => {
    const span = { start: 1000, end: null };
    expect(trackLevel(span, 1000)).toBe(0);
    expect(trackLevel(span, 1000 + CROSSFADE_MS / 2)).toBeCloseTo(0.5);
    expect(trackLevel(span, 1000 + CROSSFADE_MS)).toBe(1);
    expect(trackLevel(span, 99_000)).toBe(1);
  });

  it('the crossfade lasts 800 ms', () => {
    expect(CROSSFADE_MS).toBe(800);
  });

  it('a replaced track falls to silence over the crossfade, and is done then', () => {
    const span = { start: 0, end: 5000 };
    expect(trackLevel(span, 5000)).toBe(1);
    expect(trackLevel(span, 5000 + CROSSFADE_MS / 4)).toBeCloseTo(0.75);
    expect(trackFaded(span, 5000 + CROSSFADE_MS - 1)).toBe(false);
    expect(trackLevel(span, 5000 + CROSSFADE_MS)).toBe(0);
    expect(trackFaded(span, 5000 + CROSSFADE_MS)).toBe(true);
  });

  it('a track still playing is never done', () => {
    expect(trackFaded({ start: 0, end: null }, 99_000)).toBe(false);
  });

  it('the two tracks of a crossfade add up to full volume', () => {
    fc.assert(
      fc.property(time, fc.double({ min: 0, max: CROSSFADE_MS, noNaN: true }), (at, into) => {
        const outgoing = { start: at - 5000, end: at };
        const incoming = { start: at, end: null };
        expect(trackLevel(outgoing, at + into) + trackLevel(incoming, at + into)).toBeCloseTo(1);
      }),
    );
  });

  it('a track replaced while it still rises never jumps up', () => {
    const span = { start: 0, end: CROSSFADE_MS / 2 };
    expect(trackLevel(span, CROSSFADE_MS / 2 + 1)).toBeLessThanOrEqual(0.5);
  });

  it('a level always lies between silence and full', () => {
    fc.assert(
      fc.property(time, time, time, (start, end, now) => {
        const level = trackLevel({ start, end }, now);
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe('the music ducking under a jingle', () => {
  it('with no jingle the music plays at full', () => {
    expect(duckLevel(null, 1234)).toBe(1);
  });

  it('the music goes down to the duck level as a jingle starts, and stays there', () => {
    const duck = startDuck(null, 1000);
    expect(duckLevel(duck, 1000)).toBe(1);
    expect(duckLevel(duck, 1000 + DUCK_MS)).toBeCloseTo(DUCK_LEVEL);
    expect(duckLevel(duck, 60_000)).toBeCloseTo(DUCK_LEVEL);
    expect(DUCK_LEVEL).toBeLessThan(1);
  });

  it('when the jingle ends the music comes back up to full', () => {
    const duck = { ...startDuck(null, 0), end: 2000 };
    expect(duckLevel(duck, 2000)).toBeCloseTo(DUCK_LEVEL);
    expect(duckLevel(duck, 2000 + UNDUCK_MS / 2)).toBeCloseTo((1 + DUCK_LEVEL) / 2);
    expect(duckLevel(duck, 2000 + UNDUCK_MS)).toBe(1);
  });

  it('a jingle ended before the music got all the way down comes back from where it was', () => {
    const duck = { ...startDuck(null, 0), end: DUCK_MS / 2 };
    const reached = duckLevel({ start: 0, end: null }, DUCK_MS / 2);
    expect(duckLevel(duck, DUCK_MS / 2)).toBeCloseTo(reached);
    expect(duckLevel(duck, DUCK_MS / 2 + UNDUCK_MS)).toBe(1);
  });

  it('a new jingle goes on down from wherever the music is, with no jump', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 5000, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        (ended, after, again) => {
          const first = { ...startDuck(null, 0), end: ended };
          const now = ended + after + again;
          const before = duckLevel(first, now);
          expect(duckLevel(startDuck(first, now), now)).toBeCloseTo(before);
        },
      ),
    );
  });
});
