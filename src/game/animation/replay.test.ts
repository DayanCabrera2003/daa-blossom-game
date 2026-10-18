import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MIN_REPLAY_STEP_MS, planReplay, replayAt, REPLAY_STEP_MS } from './replay';

describe('the plan of a replayed day', () => {
  it('starts at dawn and steps forward once per REPLAY_STEP_MS until dusk', () => {
    const plan = planReplay(4);
    expect(plan).toEqual({ states: 4, step: REPLAY_STEP_MS, duration: 3 * REPLAY_STEP_MS });
    expect(replayAt(plan, 0)).toBe(0);
    expect(replayAt(plan, REPLAY_STEP_MS - 1)).toBe(0);
    expect(replayAt(plan, REPLAY_STEP_MS)).toBe(1);
    expect(replayAt(plan, 2.5 * REPLAY_STEP_MS)).toBe(2);
    expect(replayAt(plan, plan.duration)).toBe(3);
  });

  it('a day of a single state replays in no time', () => {
    const plan = planReplay(1);
    expect(plan.duration).toBe(0);
    expect(replayAt(plan, 0)).toBe(0);
    expect(replayAt(plan, 1000)).toBe(0);
  });

  it('never leaves the day, whatever the time asked', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), fc.double({ noNaN: true }), (states, t) => {
        const cursor = replayAt(planReplay(states), t);
        expect(Number.isInteger(cursor)).toBe(true);
        expect(cursor).toBeGreaterThanOrEqual(0);
        expect(cursor).toBeLessThan(states);
      }),
    );
  });

  it('a long day asked to fit a time steps faster, and never faster than its quickest step', () => {
    // A short day keeps its pace.
    expect(planReplay(4, 10_000).step).toBe(REPLAY_STEP_MS);
    // A long one fits: 101 states in ten seconds, a step every 100 ms.
    const long = planReplay(101, 10_000);
    expect(long.step).toBe(100);
    expect(long.duration).toBe(10_000);
    expect(replayAt(long, 150)).toBe(1);
    // A very long one is held at the quickest step that can still be followed.
    expect(planReplay(1001, 10_000).step).toBe(MIN_REPLAY_STEP_MS);
  });

  it('property: a day fitted to a time never lasts longer, unless at its quickest step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 400 }),
        fc.integer({ min: 1000, max: 30_000 }),
        (states, within) => {
          const plan = planReplay(states, within);
          expect(plan.step).toBeLessThanOrEqual(REPLAY_STEP_MS);
          expect(plan.step).toBeGreaterThanOrEqual(MIN_REPLAY_STEP_MS);
          if (plan.step > MIN_REPLAY_STEP_MS) expect(plan.duration).toBeLessThanOrEqual(within);
          expect(replayAt(plan, plan.duration)).toBe(states - 1);
        },
      ),
    );
  });
});
