import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { completeGraph, cycleGraph, pathGraph, starGraph } from '../generators/families';
import { countMatchings } from './countMatchings';
import { bruteForceMatching } from './maximumMatching';

/** Fibonacci with F(0) = 0, F(1) = 1. */
const fibonacci = (k: number): number => {
  let [a, b] = [0, 1];
  for (let i = 0; i < k; i++) [a, b] = [b, a + b];
  return a;
};

/** Lucas numbers: L(0) = 2, L(1) = 1, L(k) = L(k-1) + L(k-2). */
const lucas = (k: number): number => fibonacci(k - 1) + fibonacci(k + 1);

const binomial = (n: number, k: number): number => {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
};

/** (2j-1)!!: the number of perfect matchings of K_{2j}. */
const doubleFactorialOdd = (j: number): number => {
  let result = 1;
  for (let i = 1; i < 2 * j; i += 2) result *= i;
  return result;
};

/** Matchings of K_n: choose 2j sprouts to light, then pair them up perfectly. */
const telephone = (n: number): number => {
  let total = 0;
  for (let j = 0; 2 * j <= n; j++) total += binomial(n, 2 * j) * doubleFactorialOdd(j);
  return total;
};

describe('counting matchings', () => {
  it('counts the empty matching, so even an empty garden has one', () => {
    expect(countMatchings(pathGraph(0))).toBe(1);
  });

  it('a path on n sprouts has Fibonacci F(n+1) matchings', () => {
    for (let n = 0; n <= 20; n++) expect(countMatchings(pathGraph(n))).toBe(fibonacci(n + 1));
  });

  it('a cycle on n sprouts has Lucas L(n) matchings', () => {
    for (let n = 3; n <= 20; n++) expect(countMatchings(cycleGraph(n))).toBe(lucas(n));
  });

  it('a star with l leaves has l + 1 matchings', () => {
    for (let leaves = 0; leaves <= 8; leaves++) {
      expect(countMatchings(starGraph(leaves))).toBe(leaves + 1);
    }
  });

  it('a complete garden follows the telephone numbers Σ C(n,2j)(2j-1)!!', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => countMatchings(completeGraph(n)))).toEqual([
      1, 1, 2, 4, 10, 26, 76,
    ]);
    for (let n = 0; n <= 16; n++) expect(countMatchings(completeGraph(n))).toBe(telephone(n));
  });

  it('property: Bruto visits every matching, so his steps are at least their number', () => {
    fc.assert(
      fc.property(graphArb({ maxN: 9 }), (graph) => {
        expect(bruteForceMatching(graph).steps).toBeGreaterThanOrEqual(countMatchings(graph));
      }),
    );
  });
});
