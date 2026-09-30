import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { freeEdges, isMaximal } from './maximal';
import { isExposed } from './queries';

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
});
