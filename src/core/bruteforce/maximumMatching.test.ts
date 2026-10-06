import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb, graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { completeGraph, cycleGraph, pathGraph, starGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import { validateMate } from '../matching/validate';
import { unwrap } from '../shared/result';
import { bruteForceMatching, type BruteForceOutcome } from './maximumMatching';

/** The matching of a finished search; a search that gave up here is a test bug. */
const solve = (graph: Graph): Matching => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('unlimited search gave up');
  return outcome.matching;
};

const sizeOf = (graph: Graph): number => size(solve(graph));

// Level 7.3, "the helix": center C = 0 joined to one sprout of each of three triangles.
const helix = unwrap(
  createGraph(10, [
    [0, 1],
    [0, 4],
    [0, 7],
    [1, 2],
    [2, 3],
    [1, 3],
    [4, 5],
    [5, 6],
    [4, 6],
    [7, 8],
    [8, 9],
    [7, 9],
  ]),
);

describe('brute-force maximum matching (Bruto)', () => {
  it('a path or a cycle on n sprouts lights ⌊n/2⌋ lanterns', () => {
    for (let n = 0; n <= 9; n++) expect(sizeOf(pathGraph(n))).toBe(Math.floor(n / 2));
    for (let n = 3; n <= 9; n++) expect(sizeOf(cycleGraph(n))).toBe(Math.floor(n / 2));
  });

  it('the five-cycle lights only two lanterns, leaving one sprout in the dark', () => {
    expect(sizeOf(cycleGraph(5))).toBe(2);
  });

  it('a complete garden on n sprouts lights ⌊n/2⌋ lanterns', () => {
    for (let n = 0; n <= 8; n++) expect(sizeOf(completeGraph(n))).toBe(Math.floor(n / 2));
  });

  it('a star lights a single lantern, however many leaves it has', () => {
    expect(sizeOf(starGraph(0))).toBe(0);
    for (let leaves = 1; leaves <= 6; leaves++) expect(sizeOf(starGraph(leaves))).toBe(1);
  });

  it('the helix of level 7.3 lights four lanterns', () => {
    expect(sizeOf(helix)).toBe(4);
  });

  it('counts at least one step, even in an empty garden', () => {
    expect(bruteForceMatching(pathGraph(0)).steps).toBeGreaterThanOrEqual(1);
  });

  it('property: the answer is a valid matching at least as large as any other', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, other]) => {
        const best = solve(graph);
        expect(validateMate(graph, best.mate).ok).toBe(true);
        expect(size(best)).toBeGreaterThanOrEqual(size(other));
      }),
    );
  });

  it('property: the search is deterministic, including its step count', () => {
    fc.assert(
      fc.property(graphArb({ maxN: 9 }), (graph) => {
        expect(bruteForceMatching(graph)).toEqual(bruteForceMatching(graph));
      }),
    );
  });
});

describe('brute force on a budget', () => {
  const big = completeGraph(14);

  it('gives up on a big garden without exceeding its budget, keeping its best try', () => {
    const outcome: BruteForceOutcome = bruteForceMatching(big, { budget: 100 });
    expect(outcome.status).toBe('gaveUp');
    if (outcome.status !== 'gaveUp') return;
    expect(outcome.steps).toBeLessThanOrEqual(100);
    expect(validateMate(big, outcome.best.mate).ok).toBe(true);
    expect(size(outcome.best)).toBeGreaterThan(0);
  });

  it('a zero budget gives up at once with the empty matching', () => {
    const outcome = bruteForceMatching(big, { budget: 0 });
    expect(outcome).toMatchObject({ status: 'gaveUp', steps: 0 });
    if (outcome.status === 'gaveUp') expect(size(outcome.best)).toBe(0);
  });

  it('property: a budget equal to the full search cost is enough to finish', () => {
    fc.assert(
      fc.property(graphArb({ maxN: 8 }), (graph) => {
        const full = bruteForceMatching(graph);
        expect(bruteForceMatching(graph, { budget: full.steps })).toEqual(full);
        if (full.steps > 0) {
          expect(bruteForceMatching(graph, { budget: full.steps - 1 }).status).toBe('gaveUp');
        }
      }),
    );
  });
});
