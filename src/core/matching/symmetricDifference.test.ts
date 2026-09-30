import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithTwoMatchingsArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { edgeKey } from '../graph/queries';
import { unwrap } from '../shared/result';
import { flipEdges } from './augment';
import { createMatching } from './createMatching';
import { checkAugmentingPath } from './paths';
import { size } from './queries';
import { decomposeSymmetricDifference, symmetricDifference } from './symmetricDifference';

// The Mirror Pond garden: sprouts 1..6 of the design document are ids 0..5 on a path.
const pond = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
  ]),
);
const yours = unwrap(
  createMatching(pond, [
    [1, 2],
    [3, 4],
  ]),
);
const reflection = unwrap(
  createMatching(pond, [
    [0, 1],
    [2, 3],
    [4, 5],
  ]),
);

describe('symmetricDifference', () => {
  it('lists the vines lit in exactly one of the two gardens', () => {
    expect(symmetricDifference(yours, reflection)).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
    ]);
  });

  it('is empty for identical matchings', () => {
    expect(symmetricDifference(yours, yours)).toEqual([]);
  });
});

describe('decomposeSymmetricDifference', () => {
  it('the pond: one thread from 1 to 6 where the reflection wins by one', () => {
    expect(decomposeSymmetricDifference(yours, reflection)).toEqual([
      {
        kind: 'path',
        vertices: [0, 1, 2, 3, 4, 5],
        edges: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 4],
          [4, 5],
        ],
        gain: 1,
      },
    ]);
  });

  it('an alternating square is a loop that ties', () => {
    const square = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [2, 3],
        [0, 3],
      ]),
    );
    const a = unwrap(
      createMatching(square, [
        [0, 1],
        [2, 3],
      ]),
    );
    const b = unwrap(
      createMatching(square, [
        [1, 2],
        [0, 3],
      ]),
    );
    expect(decomposeSymmetricDifference(a, b)).toEqual([
      {
        kind: 'cycle',
        vertices: [0, 1, 2, 3],
        edges: [
          [0, 1],
          [1, 2],
          [2, 3],
          [3, 0],
        ],
        gain: 0,
      },
    ]);
  });

  it('property (Berge): M ⊕ M′ splits into alternating paths and even cycles that explain the size gap', () => {
    fc.assert(
      fc.property(graphWithTwoMatchingsArb(), ([g, from, to]) => {
        const components = decomposeSymmetricDifference(from, to);

        // The components use every edge of the difference exactly once and share no vertex.
        const used = components.flatMap((c) => c.edges.map(([u, v]) => edgeKey(u, v))).sort();
        const expected = symmetricDifference(from, to)
          .map(([u, v]) => edgeKey(u, v))
          .sort();
        expect(used).toEqual(expected);
        const vertices = components.flatMap((c) => c.vertices);
        expect(new Set(vertices).size).toBe(vertices.length);

        // Cycles are even and tie; paths differ by at most one; the gains add up to the gap.
        for (const c of components) {
          if (c.kind === 'cycle') {
            expect(c.edges.length % 2).toBe(0);
            expect(c.gain).toBe(0);
          } else {
            expect(Math.abs(c.gain)).toBeLessThanOrEqual(1);
          }
        }
        expect(components.reduce((sum, c) => sum + c.gain, 0)).toBe(size(to) - size(from));

        // If the other garden is bigger, some thread is a winning chain for ours.
        if (size(to) > size(from)) {
          const winning = components.filter((c) => c.kind === 'path' && c.gain === 1);
          expect(winning.length).toBeGreaterThan(0);
          for (const c of winning) expect(checkAugmentingPath(g, from, c.vertices).ok).toBe(true);
        }

        // Flipping ours along every component turns it into the other garden.
        expect(
          flipEdges(
            from,
            components.flatMap((c) => c.edges),
          ),
        ).toEqual(to);
      }),
      { numRuns: 500 },
    );
  });
});
