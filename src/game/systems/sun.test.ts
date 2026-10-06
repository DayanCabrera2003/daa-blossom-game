import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fractionOfStep, stepAtFraction } from './sun';

describe('the sun slider over the day', () => {
  it('dawn is the first state and dusk the last', () => {
    expect(stepAtFraction(0, 5)).toBe(0);
    expect(stepAtFraction(1, 5)).toBe(4);
    expect(fractionOfStep(0, 5)).toBe(0);
    expect(fractionOfStep(4, 5)).toBe(1);
  });

  it('a position between two steps snaps to the nearer one, and stays inside the day', () => {
    expect(stepAtFraction(0.6, 5)).toBe(2);
    expect(stepAtFraction(1.7, 5)).toBe(4);
    expect(stepAtFraction(-0.2, 5)).toBe(0);
  });

  it('a day with a single state keeps the sun at dusk', () => {
    expect(stepAtFraction(0.3, 1)).toBe(0);
    expect(fractionOfStep(0, 1)).toBe(1);
  });

  it('property: placing the sun on a step and reading it back gives that step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }).chain((n) => fc.tuple(fc.constant(n), fc.nat(n - 1))),
        ([n, step]) => {
          expect(stepAtFraction(fractionOfStep(step, n), n)).toBe(step);
        },
      ),
    );
  });
});
