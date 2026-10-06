import { invariant } from './invariant';
import { itemAt } from './itemAt';

/**
 * Seeded pseudo-random generator. The core never calls `Math.random`: every random choice
 * (test graphs, sandbox gardens, race gardens) flows from an explicit seed, so any run,
 * and any failing test, can be reproduced exactly.
 */
export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, bound). `bound` must be a positive integer. */
  int(bound: number): number;
  /** A shuffled copy of `items` (Fisher–Yates); the input is left untouched. */
  shuffle<T>(items: readonly T[]): T[];
  /** A uniformly chosen element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/** Creates a generator using mulberry32: tiny, fast and good enough for non-cryptographic use. */
export function createRng(seed: number): Rng {
  // Coerce to an unsigned 32-bit state; mulberry32 operates on 32-bit integers.
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (bound: number): number => {
    invariant(
      Number.isInteger(bound) && bound > 0,
      `int bound must be a positive integer, got ${bound}`,
    );
    return Math.floor(next() * bound);
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(i + 1);
      [result[i], result[j]] = [itemAt(result, j), itemAt(result, i)];
    }
    return result;
  };

  const pick = <T>(items: readonly T[]): T => {
    invariant(items.length > 0, 'cannot pick from an empty array');
    return itemAt(items, int(items.length));
  };

  return { next, int, shuffle, pick };
}
