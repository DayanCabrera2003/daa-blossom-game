import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { addPair, removePair } from './edit';
import { size } from './queries';
import { validateMate } from './validate';

// Path 0-1-2-3 with lantern 1=2.
const graph = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]),
);
const matching = unwrap(createMatching(graph, [[1, 2]]));
const empty = unwrap(createMatching(graph, []));

describe('addPair (join)', () => {
  it('lights a lantern between two sprouts in the dark', () => {
    expect(unwrap(addPair(graph, empty, 0, 1)).mate).toEqual([1, 0, -1, -1]);
  });

  it('does not mutate the original matching', () => {
    addPair(graph, empty, 0, 1);
    expect(empty.mate).toEqual([-1, -1, -1, -1]);
  });

  it('rejects sprouts that are not joined by a vine', () => {
    expect(addPair(graph, empty, 0, 3)).toEqual({
      ok: false,
      error: { code: 'notAnEdge', edge: [0, 3] },
    });
  });

  it('rejects a sprout that already holds a lantern (exclusivity)', () => {
    expect(addPair(graph, matching, 0, 1)).toEqual({
      ok: false,
      error: { code: 'alreadyMatched', vertex: 1 },
    });
  });
});

describe('removePair (split)', () => {
  it('puts out a lit lantern', () => {
    expect(unwrap(removePair(matching, 2, 1)).mate).toEqual([-1, -1, -1, -1]);
  });

  it('rejects a pair without a lantern', () => {
    expect(removePair(matching, 2, 3)).toEqual({
      ok: false,
      error: { code: 'notMatched', edge: [2, 3] },
    });
  });

  it('property: every edge of a matching can be removed, leaving a smaller valid matching', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([g, m]) => {
        m.mate.forEach((partner, v) => {
          if (partner === -1 || v > partner) return;
          const smaller = unwrap(removePair(m, v, partner));
          expect(size(smaller)).toBe(size(m) - 1);
          expect(validateMate(g, smaller.mate).ok).toBe(true);
        });
      }),
    );
  });
});
