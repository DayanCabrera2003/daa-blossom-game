import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { plantForest, type AlternatingForest } from '../search/forest';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { growStep } from '../search/growForest';
import type { Matching } from '../matching/types';
import { findOddCycle } from './detect';
import { checkBlossom } from './isBlossom';

/** Grows a forest from `roots` along the given scans, in order, as the player would. */
const growAlong = (
  matching: Matching,
  roots: number[],
  scans: [number, number][],
): AlternatingForest =>
  scans.reduce(
    (forest, [u, x]) => {
      const step = growStep(matching, forest, u, x);
      if (step.kind !== 'grow') throw new Error(`scan ${u}→${x} did not grow`);
      return step.forest;
    },
    plantForest(matching, roots),
  );

// Level 4.6: R–a=b, cycle b–c=d–f=g–b, exit c–e. R a b c d f g e = 0 1 2 3 4 5 6 7.
const petals = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 2],
    [3, 7],
  ]),
);
const petalLanterns = unwrap(
  createMatching(petals, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

describe('odd cycle detection', () => {
  it('closes the five petals of level 4.6 at their common ancestor b, the base', () => {
    // R sun, a moon, b sun, c moon, d sun, g moon, f sun; then d–f joins two suns.
    const forest = growAlong(
      petalLanterns,
      [0],
      [
        [0, 1],
        [2, 3],
        [2, 6],
      ],
    );
    expect(findOddCycle(forest, 4, 5)).toEqual([2, 3, 4, 5, 6]);
    expect(findOddCycle(forest, 5, 4)).toEqual([2, 6, 5, 4, 3]);
  });

  it('the stem of level 4.7 does not belong to the flower: the base is d', () => {
    // R–a=b–c=d, triangle d–e=f–d. R a b c d e f = 0 1 2 3 4 5 6.
    const longStem = unwrap(
      createGraph(7, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [4, 6],
      ]),
    );
    const lanterns = unwrap(
      createMatching(longStem, [
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    );
    const forest = growAlong(
      lanterns,
      [0],
      [
        [0, 1],
        [2, 3],
        [4, 5],
      ],
    );
    expect(findOddCycle(forest, 6, 4)).toEqual([4, 5, 6]);
  });

  it('only two suns of the same tree close a flower', () => {
    const forest = growAlong(petalLanterns, [0, 7], [[0, 1]]);
    expect(() => findOddCycle(forest, 2, 7)).toThrow();
    expect(() => findOddCycle(forest, 1, 2)).toThrow();
  });

  it('property: every conflict of a search closes a valid flower, base first', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const result = bipartiteSearch(graph, matching);
        if (result.ok) return;
        const { forest, from, to } = result.error;
        const cycle = findOddCycle(forest, from, to);
        expect(checkBlossom(graph, matching, cycle)).toEqual({ ok: true, value: cycle });
      }),
    );
  });
});
