import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { InvariantError } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { flipAlong, flipEdges } from './augment';
import { createMatching } from './createMatching';
import { freeEdges } from './maximal';
import { isExposed, matchedEdges, size } from './queries';
import { validateMate } from './validate';

// The bucket brigade: path 0-1-2-3-4-5 with lanterns 1=2 and 3=4.
const graph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
  ]),
);
const matching = unwrap(
  createMatching(graph, [
    [1, 2],
    [3, 4],
  ]),
);

describe('flipAlong', () => {
  it('passing lanterns along a winning chain lights one more', () => {
    const flipped = flipAlong(matching, [0, 1, 2, 3, 4, 5]);
    expect(matchedEdges(flipped)).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
    expect(size(flipped)).toBe(size(matching) + 1);
  });

  it('flipping a stem keeps the count and moves the darkness from root to base', () => {
    const flipped = flipAlong(matching, [0, 1, 2]);
    expect(size(flipped)).toBe(size(matching));
    expect(isExposed(flipped, 0)).toBe(false);
    expect(isExposed(flipped, 2)).toBe(true);
  });

  it('does not mutate the original matching', () => {
    flipAlong(matching, [0, 1, 2, 3, 4, 5]);
    expect(matching.mate).toEqual([-1, 2, 1, 4, 3, -1]);
  });

  it('flipping the same path twice restores the matching', () => {
    const path = [0, 1, 2, 3, 4, 5];
    expect(flipAlong(flipAlong(matching, path), path)).toEqual(matching);
  });

  it('refuses a flip that would give a sprout two lanterns (caller bug)', () => {
    // 1 is lit with 2; lighting 0-1 without putting out 1=2 breaks exclusivity.
    expect(() => flipAlong(matching, [0, 1])).toThrow(InvariantError);
  });
});

describe('flipEdges', () => {
  it('flips an alternating cycle without changing the count', () => {
    const square = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 3],
      ]),
    );
    const m = unwrap(
      createMatching(square, [
        [0, 1],
        [2, 3],
      ]),
    );
    const cycle = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ] as const;
    expect(matchedEdges(flipEdges(m, cycle))).toEqual([
      [0, 3],
      [1, 2],
    ]);
  });

  it('property: flipping a free vine adds one lantern; flipping a lit one removes it', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([g, m]) => {
        for (const edge of freeEdges(g, m)) {
          const bigger = flipEdges(m, [edge]);
          expect(size(bigger)).toBe(size(m) + 1);
          expect(validateMate(g, bigger.mate).ok).toBe(true);
        }
        for (const edge of matchedEdges(m)) expect(size(flipEdges(m, [edge]))).toBe(size(m) - 1);
      }),
    );
  });
});
