import { describe, expect, it } from 'vitest';
import { createBudget } from './budget';

describe('step budget', () => {
  it('counts each step it grants', () => {
    const budget = createBudget(5);
    expect(budget.spend()).toBe(true);
    expect(budget.spend()).toBe(true);
    expect(budget.steps).toBe(2);
    expect(budget.exhausted).toBe(false);
  });

  it('refuses once the limit is reached, never counting past it (Bruto falls asleep)', () => {
    const budget = createBudget(2);
    budget.spend();
    budget.spend();
    expect(budget.spend()).toBe(false);
    expect(budget.spend()).toBe(false);
    expect(budget.steps).toBe(2);
    expect(budget.exhausted).toBe(true);
  });

  it('a zero budget grants nothing', () => {
    const budget = createBudget(0);
    expect(budget.spend()).toBe(false);
    expect(budget.steps).toBe(0);
  });

  it('is unlimited by default', () => {
    const budget = createBudget();
    for (let i = 0; i < 1000; i++) expect(budget.spend()).toBe(true);
    expect(budget.steps).toBe(1000);
    expect(budget.exhausted).toBe(false);
  });

  it('rejects a negative or fractional limit', () => {
    expect(() => createBudget(-1)).toThrow();
    expect(() => createBudget(1.5)).toThrow();
  });
});
