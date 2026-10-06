import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { planReplay, replayAt, REPLAY_STEP_MS } from './replay';

describe('the plan of a replayed day', () => {
  it('starts at dawn and steps forward once per REPLAY_STEP_MS until dusk', () => {
    const plan = planReplay(4);
    expect(plan).toEqual({ states: 4, duration: 3 * REPLAY_STEP_MS });
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
});
