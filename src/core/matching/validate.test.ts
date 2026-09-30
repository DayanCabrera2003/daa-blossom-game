import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { validateMate } from './validate';

// Triangle 0-1-2 plus an isolated vertex 3.
const graph = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [0, 2],
  ]),
);

describe('validateMate', () => {
  it('accepts a consistent mate array', () => {
    expect(validateMate(graph, [1, 0, -1, -1])).toEqual({
      ok: true,
      value: { mate: [1, 0, -1, -1] },
    });
  });

  it('rejects a mate array of the wrong length', () => {
    expect(validateMate(graph, [-1, -1])).toEqual({
      ok: false,
      error: { code: 'wrongLength', expected: 4, actual: 2 },
    });
  });

  it('rejects a partner outside the graph', () => {
    expect(validateMate(graph, [7, -1, -1, -1])).toEqual({
      ok: false,
      error: { code: 'invalidPartner', vertex: 0, partner: 7 },
    });
  });

  it('rejects an asymmetric pair', () => {
    expect(validateMate(graph, [1, 2, 1, -1])).toEqual({
      ok: false,
      error: { code: 'asymmetric', vertex: 0, partner: 1 },
    });
  });

  it('rejects a pair that is not a vine', () => {
    expect(validateMate(graph, [3, -1, -1, 0])).toEqual({
      ok: false,
      error: { code: 'notAnEdge', vertex: 0, partner: 3 },
    });
  });

  it('property: every matching built from edges passes validation', () => {
    fc.assert(
      fc.property(
        graphArb().chain((g) => fc.tuple(fc.constant(g), fc.shuffledSubarray([...g.edges]))),
        ([g, edges]) => {
          // Greedily keep the edges that do not clash, so the result is a matching.
          const used = new Set<number>();
          const pairs = edges.filter(([u, v]) => {
            if (used.has(u) || used.has(v)) return false;
            used.add(u).add(v);
            return true;
          });
          const matching = unwrap(createMatching(g, pairs));
          expect(validateMate(g, matching.mate).ok).toBe(true);
        },
      ),
    );
  });
});
