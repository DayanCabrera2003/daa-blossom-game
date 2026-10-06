import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithDensityArb, matchingArb } from '../../../tests/support/arbitraries';
import { BRUTO_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { stonesFromForest } from '../certificates/fromForest';
import { checkTutteBerge } from '../certificates/tutteBerge';
import { cycleGraph, pathGraph } from '../generators/families';
import {
  helix as helixOf,
  longStemFlower,
  manyFlowers,
  nestedFlowers,
} from '../generators/hardCases';
import { fastEdmonds } from './fast/solve';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { size } from '../matching/queries';
import { validateMate } from '../matching/validate';
import { unwrap } from '../shared/result';
import { edmonds } from './solve';

const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

/** The stones the run hands over. */
const stonesOf = (run: ReturnType<typeof edmonds>) =>
  stonesFromForest(run.finalLayer, run.finalForest);

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

describe('Edmonds, the full recipe', () => {
  it('the five-cycle: two lanterns, proved with no stones at all (level 7.2)', () => {
    const run = edmonds(cycleGraph(5));
    expect(size(run.matching)).toBe(2);
    expect(stonesOf(run)).toEqual([]);
  });

  it('the helix: four lanterns, proved by lifting C (level 7.3)', () => {
    const run = edmonds(helix);
    expect(size(run.matching)).toBe(4);
    expect(stonesOf(run)).toEqual([0]);
  });

  it('records the whole run and ends with done', () => {
    const run = edmonds(pathGraph(4));
    expect(run.trace.at(-1)).toEqual({ type: 'done', size: 2 });
    expect(run.steps).toBe(run.trace.length);
  });

  it('starts from the lanterns it is given', () => {
    const path = pathGraph(4);
    const run = edmonds(path, { mate: [-1, 2, 1, -1] });
    expect(run.trace.filter((event) => event.type === 'augment')).toEqual([
      { type: 'augment', path: [3, 2, 1, 0] },
    ]);
  });

  it(
    'master property: maximum (checked by Bruto), valid, and proved by its own stones',
    () => {
      fc.assert(
        fc.property(
          graphWithDensityArb({ maxN: 12 }).chain((graph) =>
            fc.tuple(fc.constant(graph), matchingArb(graph)),
          ),
          ([graph, initial]) => {
            const run = edmonds(graph, initial);
            expect(validateMate(graph, run.matching.mate).ok).toBe(true);
            expect(size(run.matching)).toBe(optimum(graph));
            expect(checkTutteBerge(graph, run.matching, stonesOf(run)).ok).toBe(true);
            // Termination (C10): each chain lights one more lantern, so at most n/2 of them.
            const chains = run.trace.filter((event) => event.type === 'augment').length;
            expect(chains).toBe(size(run.matching) - size(initial));
            expect(chains).toBeLessThanOrEqual(graph.n / 2);
          },
        ),
        { numRuns: 1000 },
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );

  it('master property on hard cases: long stems, nested and many flowers, helices', () => {
    // These gardens are too big for Bruto; the run's own certificate proves the optimum instead,
    // and the fast version is a second, independent opinion.
    const hardCase = fc.oneof(
      fc.integer({ min: 0, max: 25 }).map(longStemFlower),
      fc.integer({ min: 1, max: 12 }).map(nestedFlowers),
      fc.integer({ min: 1, max: 15 }).map(helixOf),
      fc.integer({ min: 1, max: 10 }).map(manyFlowers),
    );
    fc.assert(
      fc.property(
        hardCase.chain((generated) =>
          fc.tuple(fc.constant(generated), matchingArb(generated.graph)),
        ),
        ([{ graph, matching }, random]) => {
          for (const initial of [matching, random]) {
            const run = edmonds(graph, initial);
            expect(validateMate(graph, run.matching.mate).ok).toBe(true);
            expect(checkTutteBerge(graph, run.matching, stonesOf(run)).ok).toBe(true);
            expect(size(run.matching)).toBe(size(fastEdmonds(graph)));
          }
        },
      ),
    );
  });
});
