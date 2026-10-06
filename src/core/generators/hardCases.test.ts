import { describe, expect, it } from 'vitest';
import { nestingDepth } from '../blossom/hierarchy';
import { stonesFromForest } from '../certificates/fromForest';
import { checkTutteBerge } from '../certificates/tutteBerge';
import { edmonds } from '../edmonds/solve';
import { size } from '../matching/queries';
import type { TraceEvent } from '../trace/events';
import { helix, longStemFlower, manyFlowers, nestedFlowers } from './hardCases';

const contracts = (trace: readonly TraceEvent[]) =>
  trace.filter(
    (event): event is Extract<TraceEvent, { type: 'contract' }> => event.type === 'contract',
  );

/** Runs Edmonds from the generated lanterns and checks the run proves itself. */
const solveProved = ({ graph, matching }: ReturnType<typeof helix>) => {
  const run = edmonds(graph, matching);
  const stones = stonesFromForest(run.finalLayer, run.finalForest);
  expect(checkTutteBerge(graph, run.matching, stones).ok).toBe(true);
  return run;
};

describe('hard cases for the recipe', () => {
  it('a flower at the end of a long stem: one fold, and the base is the end of the stem (4.7)', () => {
    for (const stem of [0, 1, 4, 9]) {
      const run = solveProved(longStemFlower(stem));
      expect(contracts(run.trace).map(({ base, cycle }) => [base, cycle.length])).toEqual([
        [2 * stem, 3],
      ]);
      expect(size(run.matching)).toBe(stem + 1);
    }
  });

  it('flowers nested k + 1 deep, each folding the one before (5.1, 5.2)', () => {
    for (const k of [1, 2, 3, 5]) {
      const generated = nestedFlowers(k);
      const run = solveProved(generated);
      const deepest = Math.max(
        ...[...Array(generated.graph.n).keys()].map((v) => nestingDepth(run.finalLayer, v)),
      );
      expect(deepest).toBe(k + 1);
      expect(size(run.matching)).toBe(2 * k + 1);
    }
  });

  it('a helix of k arms lights k + 1 lanterns, proved by lifting its center (7.3)', () => {
    // With one arm the garden is perfectly lit and needs no stones at all; from two arms on,
    // sprouts sleep in the dark and the center is the stone that proves it.
    for (const arms of [2, 3, 6]) {
      const generated = helix(arms);
      const run = solveProved(generated);
      expect(size(run.matching)).toBe(arms + 1);
      expect(stonesFromForest(run.finalLayer, run.finalForest)).toEqual([0]);
    }
  });

  it('several flowers in one search, on separate branches (4.8)', () => {
    for (const count of [1, 2, 5]) {
      const run = solveProved(manyFlowers(count));
      expect(contracts(run.trace)).toHaveLength(count);
      expect(size(run.matching)).toBe(2 * count);
    }
  });

  it('rejects sizes that make no garden', () => {
    expect(() => longStemFlower(-1)).toThrow();
    expect(() => nestedFlowers(0)).toThrow();
    expect(() => helix(0)).toThrow();
    expect(() => manyFlowers(1.5)).toThrow();
  });
});
