import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb, graphWithTwoMatchingsArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { neighbors } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { InvariantError } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { flipAlong, flipEdges } from './augment';
import { createMatching } from './createMatching';
import { freeEdges } from './maximal';
import { checkAugmentingPath, checkStem } from './paths';
import { exposedVertices, isExposed, mateOf, matchedEdges, size } from './queries';
import { decomposeSymmetricDifference } from './symmetricDifference';
import type { Matching } from './types';
import { validateMate } from './validate';

/**
 * An alternating walk from a sprout in the dark, steered by `choices`: from the current end it
 * takes a dark vine to a new sprout; a sprout in the dark there ends a winning chain, and a lit one
 * is left at once by its lantern. It stops when there is no new sprout to go to or no choice left.
 */
function alternatingWalk(
  graph: Graph,
  matching: Matching,
  start: VertexId,
  choices: readonly number[],
): VertexId[] {
  const path = [start];
  for (const choice of choices) {
    const end = path.at(-1) as VertexId;
    const next = neighbors(graph, end).filter((x) => !path.includes(x));
    if (next.length === 0) break;
    const y = next[choice % next.length] as VertexId;
    path.push(y);
    if (isExposed(matching, y)) break;
    // y's partner is new: every sprout of the walk but the first came in pairs with its partner.
    path.push(mateOf(matching, y));
  }
  return path;
}

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

  it('property (Códex C2, Lemmas 2.3 and 2.4): a chain lights one more; a stem moves the dark', () => {
    fc.assert(
      fc.property(
        graphWithMatchingArb(),
        fc.nat(),
        fc.array(fc.nat(), { maxLength: 10 }),
        ([g, m], pick, choices) => {
          const dark = exposedVertices(m);
          if (dark.length === 0) return;
          const start = dark[pick % dark.length] as VertexId;
          const path = alternatingWalk(g, m, start, choices);
          const end = path.at(-1) as VertexId;
          const flipped = flipAlong(m, path);
          expect(validateMate(g, flipped.mate).ok).toBe(true);
          const exposed = (x: Matching): VertexId[] => exposedVertices(x).sort((a, b) => a - b);
          if (path.length % 2 === 0) {
            // Odd length, both ends in the dark: a winning chain (Lemma 2.3).
            expect(checkAugmentingPath(g, m, path).ok).toBe(true);
            expect(size(flipped)).toBe(size(m) + 1);
            expect(exposed(flipped)).toEqual(exposed(m).filter((v) => v !== start && v !== end));
          } else {
            // Even length from the dark: a stem, worth nothing but moving the dark (Lemma 2.4).
            expect(checkStem(g, m, path).ok).toBe(true);
            expect(size(flipped)).toBe(size(m));
            const moved = [...exposed(m).filter((v) => v !== start), end].sort((a, b) => a - b);
            expect(exposed(flipped)).toEqual(moved);
          }
        },
      ),
    );
  });

  it('property (Códex C2, Lemma 2.5): flipping an alternating loop keeps who has a lantern', () => {
    fc.assert(
      fc.property(graphWithTwoMatchingsArb(), ([g, from, to]) => {
        for (const piece of decomposeSymmetricDifference(from, to)) {
          if (piece.kind !== 'cycle') continue;
          const flipped = flipEdges(from, piece.edges);
          expect(validateMate(g, flipped.mate).ok).toBe(true);
          expect(size(flipped)).toBe(size(from));
          expect(exposedVertices(flipped)).toEqual(exposedVertices(from));
        }
      }),
    );
  });
});
