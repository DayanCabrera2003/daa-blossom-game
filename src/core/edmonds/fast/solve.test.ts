import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithDensityArb, matchingArb } from '../../../../tests/support/arbitraries';
import { BRUTO_PROPERTY_TIMEOUT } from '../../../../tests/support/timeouts';
import { bruteForceMatching } from '../../bruteforce/maximumMatching';
import { createOperationCounter } from '../../cost/operationCounter';
import { cycleGraph, pathGraph } from '../../generators/families';
import { randomGraph } from '../../generators/random';
import { createGraph } from '../../graph/createGraph';
import type { Graph } from '../../graph/types';
import { size } from '../../matching/queries';
import { validateMate } from '../../matching/validate';
import { unwrap } from '../../shared/result';
import { createRng } from '../../shared/rng';
import { edmonds } from '../solve';
import { fastEdmonds } from './solve';

const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

// Level 5.1: R a b c d g h t = 0 1 2 3 4 5 6 7.
const wild = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
    [5, 6],
    [0, 6],
    [1, 7],
  ]),
);

describe('fast Edmonds (the second oracle)', () => {
  it('solves the gardens of the story', () => {
    expect(size(fastEdmonds(cycleGraph(5)))).toBe(2);
    expect(size(fastEdmonds(pathGraph(7)))).toBe(3);
    expect(size(fastEdmonds(wild))).toBe(4);
    expect(size(fastEdmonds(unwrap(createGraph(0, []))))).toBe(0);
  });

  it('starts from the lanterns it is given', () => {
    expect(fastEdmonds(pathGraph(4), { mate: [-1, 2, 1, -1] }).mate).toEqual([1, 0, 3, 2]);
  });

  it('counts its work by kind', () => {
    const counter = createOperationCounter();
    fastEdmonds(wild, undefined, counter);
    const { scan, label, rebase, flip } = counter.counts;
    expect(scan).toBeGreaterThan(0);
    expect(label).toBeGreaterThan(0);
    expect(rebase).toBeGreaterThan(0);
    // Four chains from a garden in the dark, each passing at least one lantern.
    expect(flip).toBeGreaterThanOrEqual(4);
  });

  it(
    'property (triple check, small): fast = Bruto, and the answer is valid',
    () => {
      fc.assert(
        fc.property(
          graphWithDensityArb({ maxN: 12 }).chain((graph) =>
            fc.tuple(fc.constant(graph), matchingArb(graph)),
          ),
          ([graph, initial]) => {
            const matching = fastEdmonds(graph, initial);
            expect(validateMate(graph, matching.mate).ok).toBe(true);
            expect(size(matching)).toBe(optimum(graph));
          },
        ),
        { numRuns: 1000 },
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );

  it('property (triple check, large): fast = didactic on sparse gardens of up to 200 sprouts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 200 }),
        fc.integer({ min: 1, max: 6 }),
        fc.integer(),
        (n, degree, seed) => {
          const graph = randomGraph(n, degree / n, createRng(seed));
          const matching = fastEdmonds(graph);
          expect(validateMate(graph, matching.mate).ok).toBe(true);
          expect(size(matching)).toBe(size(edmonds(graph).matching));
        },
      ),
      { numRuns: 30 },
    );
  });
});
