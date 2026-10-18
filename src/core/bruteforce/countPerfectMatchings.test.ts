import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { completeGraph, cycleGraph, pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import { countPerfectMatchings } from './countPerfectMatchings';
import { bruteForceMatching } from './maximumMatching';

/** (2k − 1)!! = 1 · 3 · … · (2k − 1): the perfect matchings of K_{2k}. */
const doubleFactorialOdd = (k: number): number => {
  let result = 1;
  for (let i = 1; i < 2 * k; i += 2) result *= i;
  return result;
};

/**
 * Naphthalene: two rings of six carbons sharing the bond 4–5. Ring 0–1–2–3–4–5 and ring
 * 4–5–6–7–8–9, so 10 carbons and 11 bonds (hydrogens are left out, as in a Kekulé structure).
 */
const naphthalene = unwrap(
  createGraph(10, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 4],
  ]),
);

describe('counting the perfect matchings (Códex C14)', () => {
  it('the ring of benzene, and every even ring, lights everyone in exactly two ways', () => {
    expect(countPerfectMatchings(cycleGraph(6))).toBe(2);
    for (let k = 2; k <= 12; k++) expect(countPerfectMatchings(cycleGraph(2 * k))).toBe(2);
  });

  it('an odd ring, or any garden with an odd number of sprouts, has none', () => {
    for (let n = 3; n <= 15; n += 2) expect(countPerfectMatchings(cycleGraph(n))).toBe(0);
    expect(countPerfectMatchings(completeGraph(7))).toBe(0);
  });

  it('naphthalene has three Kekulé structures', () => {
    expect(countPerfectMatchings(naphthalene)).toBe(3);
  });

  it('a path lights everyone in one way when it is even, the empty garden in one way too', () => {
    expect(countPerfectMatchings(pathGraph(0))).toBe(1);
    for (let n = 1; n <= 12; n++) expect(countPerfectMatchings(pathGraph(n))).toBe(1 - (n % 2));
  });

  it('the complete garden K_2k has (2k − 1)!! of them', () => {
    for (let k = 0; k <= 7; k++) {
      expect(countPerfectMatchings(completeGraph(2 * k))).toBe(doubleFactorialOdd(k));
    }
  });

  it('property: there is one exactly when a maximum matching covers every sprout', () => {
    fc.assert(
      fc.property(graphArb({ maxN: 10 }), (graph) => {
        const outcome = bruteForceMatching(graph);
        if (outcome.status !== 'complete') throw new Error('brute force gave up');
        const perfect = 2 * size(outcome.matching) === graph.n;
        expect(countPerfectMatchings(graph) > 0).toBe(perfect);
      }),
    );
  });
});
