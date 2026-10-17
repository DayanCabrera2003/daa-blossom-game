import { describe, expect, it } from 'vitest';
import { counterAt, FINISH_PAUSE_MS, raceDuration, STEP_DOUBLING_MS, stepsAt } from './raceClock';

describe('the clock of a race (6.4, 6.5)', () => {
  it('starts at no steps and doubles its count at a steady pace, so a million fit in seconds', () => {
    expect(stepsAt(0)).toBe(0);
    expect(stepsAt(-10)).toBe(0);
    expect(stepsAt(STEP_DOUBLING_MS)).toBe(1);
    expect(stepsAt(2 * STEP_DOUBLING_MS)).toBe(3);
    expect(stepsAt(10 * STEP_DOUBLING_MS)).toBe(1_023);
    expect(stepsAt(20 * STEP_DOUBLING_MS)).toBeGreaterThan(1_000_000);
    expect(20 * STEP_DOUBLING_MS).toBeLessThan(10_000);
  });

  it('shows each runner at the count of the clock until he reaches his own steps', () => {
    const run = { steps: 40, asleep: false };
    expect(counterAt(run, 0)).toEqual({ steps: 0, finished: false, asleep: false });
    expect(counterAt(run, 3 * STEP_DOUBLING_MS)).toEqual({
      steps: 7,
      finished: false,
      asleep: false,
    });
    expect(counterAt(run, Infinity)).toEqual({ steps: 40, finished: true, asleep: false });
  });

  it('a runner who falls asleep shows asleep once his count runs out, never a finish', () => {
    const run = { steps: 1_000, asleep: true };
    expect(counterAt(run, 5 * STEP_DOUBLING_MS).asleep).toBe(false);
    expect(counterAt(run, Infinity)).toEqual({ steps: 1_000, finished: false, asleep: true });
  });

  it('lasts until the slower runner stops, and a pause to read the counters', () => {
    const quick = { steps: 3, asleep: false };
    const slow = { steps: 1_023, asleep: true };
    const duration = raceDuration([quick, slow]);
    expect(duration).toBe(10 * STEP_DOUBLING_MS + FINISH_PAUSE_MS);
    expect(counterAt(slow, duration - FINISH_PAUSE_MS).asleep).toBe(true);
    expect(counterAt(slow, duration - FINISH_PAUSE_MS - 1).asleep).toBe(false);
  });
});
