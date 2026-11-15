import { describe, expect, it } from 'vitest';
import { playTime, startReadingClock, tickReading } from './readingClock';

describe('the clock of the hint wait (GDD §5.3)', () => {
  it('runs with the scene while nothing is read', () => {
    const clock = tickReading(startReadingClock(), 5_000, false);
    expect(playTime(clock, 5_000)).toBe(5_000);
    expect(playTime(clock, 9_000)).toBe(9_000);
  });

  it('stops while a dialogue or a card is open, and goes on from there once it closes', () => {
    const reading = tickReading(startReadingClock(), 10_000, true);
    expect(playTime(reading, 10_000)).toBe(10_000);
    expect(playTime(reading, 70_000)).toBe(10_000);
    const closed = tickReading(tickReading(reading, 40_000, true), 70_000, false);
    expect(playTime(closed, 70_000)).toBe(10_000);
    expect(playTime(closed, 75_000)).toBe(15_000);
  });

  it('adds up every reading', () => {
    let clock = startReadingClock();
    for (const [time, reading] of [
      [1_000, true],
      [3_000, false],
      [5_000, true],
      [9_000, false],
    ] as const) {
      clock = tickReading(clock, time, reading);
    }
    // Two seconds read, then four: six of the ten seconds are not play.
    expect(playTime(clock, 10_000)).toBe(4_000);
  });
});
