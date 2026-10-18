import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { createGraph } from '../graph/createGraph';
import { itemAt } from '../shared/itemAt';
import { unwrap } from '../shared/result';
import { flipEdges } from './augment';
import { createMatching } from './createMatching';
import { freeEdges, isMaximal } from './maximal';
import { isExposed, size } from './queries';
import type { Matching } from './types';

// Level 1.1 (the trap), as a path a-b-c-d = 0-1-2-3.
const path = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]),
);

describe('maximality', () => {
  it('the middle lantern alone is maximal but not maximum (the trap)', () => {
    const trap = unwrap(createMatching(path, [[1, 2]]));
    expect(isMaximal(path, trap)).toBe(true);
    expect(freeEdges(path, trap)).toEqual([]);
  });

  it('lists the vines whose two sprouts are both in the dark', () => {
    const one = unwrap(createMatching(path, [[0, 1]]));
    expect(isMaximal(path, one)).toBe(false);
    expect(freeEdges(path, one)).toEqual([[2, 3]]);
  });

  it('property: a free edge has both endpoints exposed, and maximal means none exist', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([g, m]) => {
        const free = freeEdges(g, m);
        for (const [u, v] of free) expect(isExposed(m, u) && isExposed(m, v)).toBe(true);
        const expected = g.edges.filter(([u, v]) => isExposed(m, u) && isExposed(m, v));
        expect(free).toEqual(expected);
        expect(isMaximal(g, m)).toBe(free.length === 0);
      }),
    );
  });

  it('property (Códex C1, Prop. 1.6): a maximal matching lights at least half the most lanterns', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([g, start]) => {
        // Light free vines one by one until none is left: the garden is then maximal.
        let m: Matching = start;
        for (let free = freeEdges(g, m); free.length > 0; free = freeEdges(g, m)) {
          m = flipEdges(m, [itemAt(free, 0)]);
        }
        expect(isMaximal(g, m)).toBe(true);
        const best = bruteForceMatching(g);
        if (best.status === 'complete')
          expect(2 * size(m)).toBeGreaterThanOrEqual(size(best.matching));
      }),
    );
  });
});
