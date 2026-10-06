import { invariant } from '../shared/invariant';

/**
 * A step counter with a ceiling. Bruto spends one step per partial combination he looks at; when
 * the budget runs out he falls asleep (race II) instead of freezing the game. The counter is local
 * mutable state owned by a single search call, so the search as a whole stays pure.
 */
export interface StepBudget {
  /** Steps granted so far; never exceeds the limit. */
  readonly steps: number;
  /** Whether a further step would be refused. */
  readonly exhausted: boolean;
  /** Grants one more step if the budget allows it; returns false (and counts nothing) otherwise. */
  spend(): boolean;
}

/** A fresh budget of `limit` steps (unlimited by default). */
export function createBudget(limit: number = Infinity): StepBudget {
  invariant(
    limit === Infinity || (Number.isInteger(limit) && limit >= 0),
    `budget limit must be a non-negative integer or Infinity, got ${limit}`,
  );
  let steps = 0;
  return {
    get steps() {
      return steps;
    },
    get exhausted() {
      return steps >= limit;
    },
    spend() {
      if (steps >= limit) return false;
      steps++;
      return true;
    },
  };
}
