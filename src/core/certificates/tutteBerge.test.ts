import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { cycleGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import { checkTutteBerge, tutteBergeBound } from './tutteBerge';

const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

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
// C with the first triangle, and one inner lantern in each of the other two.
const helixLanterns = unwrap(
  createMatching(helix, [
    [0, 1],
    [2, 3],
    [4, 5],
    [7, 8],
  ]),
);

describe('Tutte–Berge certificate (stones)', () => {
  it('the five-cycle: no stones, one odd group, so at most two lanterns (level 7.2)', () => {
    const c5 = cycleGraph(5);
    expect(tutteBergeBound(c5, [])).toBe(2);
    const two = unwrap(
      createMatching(c5, [
        [0, 1],
        [2, 3],
      ]),
    );
    expect(checkTutteBerge(c5, two, [])).toEqual({
      ok: true,
      value: { bound: 2, oddGroups: [[0, 1, 2, 3, 4]] },
    });
  });

  it('the helix with C lifted: dark ≥ 3 odd groups − 1 stone, so four lanterns are proved (7.3)', () => {
    expect(tutteBergeBound(helix, [0])).toBe(4);
    expect(checkTutteBerge(helix, helixLanterns, [0]).ok).toBe(true);
  });

  it('badly chosen stones give a bound that does not close', () => {
    expect(checkTutteBerge(helix, helixLanterns, [])).toEqual({
      ok: false,
      error: { code: 'notTight', bound: 5, size: 4 },
    });
  });

  it('rejects unknown or repeated stones', () => {
    expect(checkTutteBerge(helix, helixLanterns, [0, 12])).toMatchObject({
      ok: false,
      error: { code: 'vertexOutOfRange', index: 1, vertex: 12 },
    });
    expect(checkTutteBerge(helix, helixLanterns, [0, 0])).toMatchObject({
      ok: false,
      error: { code: 'repeatedVertex', index: 1, vertex: 0 },
    });
  });

  it('property (weak duality, C12): no stones can bound below the true maximum', () => {
    fc.assert(
      fc.property(
        graphArb({ maxN: 9 }).chain((graph) =>
          fc.tuple(fc.constant(graph), fc.subarray([...Array(graph.n).keys()])),
        ),
        ([graph, stones]) => {
          expect(tutteBergeBound(graph, stones)).toBeGreaterThanOrEqual(optimum(graph));
        },
      ),
    );
  });
});
