import { describe, expect, it } from 'vitest';
import { DOUBLING_ANSWERS, doublingAnswer } from './doubling';

/** A runner who finished in `steps`. */
const ran = (steps: number) => ({ steps, asleep: false });
/** A runner who fell asleep after `steps`, his budget. */
const slept = (steps: number) => ({ steps, asleep: true });

describe('the answer of a doubling bet (level 6.5)', () => {
  it('offers three answers, from the gentlest growth to the wildest', () => {
    expect(DOUBLING_ANSWERS).toEqual(['double', 'fourToEight', 'farMore']);
  });

  it('twice the steps is about double, clearly', () => {
    expect(doublingAnswer(ran(100), ran(200))).toEqual({ answer: 'double', clear: true });
    expect(doublingAnswer(ran(100), ran(170))).toEqual({ answer: 'double', clear: true });
  });

  it('from about four to eight times the steps is the middle answer, ≈ included', () => {
    for (const steps of [360, 400, 600, 800, 900]) {
      expect(doublingAnswer(ran(100), ran(steps))).toEqual({ answer: 'fourToEight', clear: true });
    }
  });

  it('far more steps, or falling asleep, is the last answer', () => {
    expect(doublingAnswer(ran(300), ran(500_000))).toEqual({ answer: 'farMore', clear: true });
    expect(doublingAnswer(ran(300), slept(1_000_000))).toEqual({ answer: 'farMore', clear: true });
    // Asleep twice: he sleeps again, whatever his budget.
    expect(doublingAnswer(slept(1_000), slept(1_000))).toEqual({ answer: 'farMore', clear: true });
  });

  it('a ratio near the edge of two answers is answered but not clear', () => {
    // Between double and four (√8 ≈ 2.83), and between eight and sixteen (√128 ≈ 11.3).
    expect(doublingAnswer(ran(100), ran(280))).toEqual({ answer: 'double', clear: false });
    expect(doublingAnswer(ran(100), ran(290))).toEqual({ answer: 'fourToEight', clear: false });
    expect(doublingAnswer(ran(100), ran(1_100))).toEqual({ answer: 'fourToEight', clear: false });
    expect(doublingAnswer(ran(100), ran(1_200))).toEqual({ answer: 'farMore', clear: false });
  });

  it('barely more steps is no doubling at all: not clear', () => {
    expect(doublingAnswer(ran(100), ran(120))).toEqual({ answer: 'double', clear: false });
    expect(doublingAnswer(ran(100), ran(80))).toEqual({ answer: 'double', clear: false });
  });

  it('waking up in the bigger garden after sleeping in the smaller one is never clear', () => {
    expect(doublingAnswer(slept(1_000), ran(500))).toEqual({ answer: 'farMore', clear: false });
  });

  it('a race of no steps has nothing to compare with', () => {
    expect(() => doublingAnswer(ran(0), ran(10))).toThrow();
  });
});
