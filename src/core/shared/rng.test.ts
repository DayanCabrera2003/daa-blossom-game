import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvariantError } from './invariant';
import { createRng } from './rng';

/** Draws `count` numbers from a fresh generator seeded with `seed`. */
const draw = (seed: number, count: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
};

describe('createRng', () => {
  it('is deterministic: the same seed yields the same sequence', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        expect(draw(seed, 20)).toEqual(draw(seed, 20));
      }),
    );
  });

  it('different seeds yield different sequences', () => {
    expect(draw(1, 5)).not.toEqual(draw(2, 5));
  });

  it('next stays in [0, 1)', () => {
    for (const value of draw(42, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('next is roughly uniform', () => {
    const values = draw(7, 10_000);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean).toBeGreaterThan(0.48);
    expect(mean).toBeLessThan(0.52);
  });

  it('int(k) stays in [0, k) and hits every value', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
      seen.add(value);
    }
    expect(seen.size).toBe(6);
  });

  it('int rejects a bound that is not a positive integer', () => {
    const rng = createRng(0);
    expect(() => rng.int(0)).toThrow(InvariantError);
    expect(() => rng.int(2.5)).toThrow(InvariantError);
  });

  it('shuffle returns a permutation without mutating the input', () => {
    fc.assert(
      fc.property(fc.integer(), fc.array(fc.integer()), (seed, items) => {
        const copy = [...items];
        const shuffled = createRng(seed).shuffle(items);
        expect(items).toEqual(copy);
        expect([...shuffled].sort((a, b) => a - b)).toEqual([...items].sort((a, b) => a - b));
      }),
    );
  });

  it('pick returns an element of the array', () => {
    const rng = createRng(9);
    const items = ['R', 'a', 'b'];
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.pick(items));
  });

  it('pick rejects an empty array', () => {
    expect(() => createRng(0).pick([])).toThrow(InvariantError);
  });
});
