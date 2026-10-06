import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { freeEdges } from './maximal';
import { checkAlternatingPath, checkAugmentingPath, checkStem } from './paths';
import { matchedEdges } from './queries';

// The bucket brigade: path 0-1-2-3-4-5 with lanterns 1=2 and 3=4; 0 and 5 in the dark.
// Vine 0-2 closes a triangle so non-alternating walks along real vines can be tested.
const graph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [0, 2],
  ]),
);
const matching = unwrap(
  createMatching(graph, [
    [1, 2],
    [3, 4],
  ]),
);

describe('checkAlternatingPath', () => {
  it('accepts a single sprout (no vines)', () => {
    expect(checkAlternatingPath(graph, matching, [3])).toEqual({
      ok: true,
      value: { vertices: [3], firstEdgeMatched: null },
    });
  });

  it('accepts a path that alternates dark and lit vines, reporting how it starts', () => {
    expect(unwrap(checkAlternatingPath(graph, matching, [0, 1, 2, 3])).firstEdgeMatched).toBe(
      false,
    );
    expect(unwrap(checkAlternatingPath(graph, matching, [1, 2, 3, 4])).firstEdgeMatched).toBe(true);
  });

  it('rejects the empty path', () => {
    expect(checkAlternatingPath(graph, matching, [])).toEqual({
      ok: false,
      error: { code: 'empty' },
    });
  });

  it('rejects a vertex outside the graph', () => {
    expect(checkAlternatingPath(graph, matching, [4, 9])).toEqual({
      ok: false,
      error: { code: 'vertexOutOfRange', index: 1, vertex: 9 },
    });
  });

  it('rejects a repeated sprout', () => {
    expect(checkAlternatingPath(graph, matching, [0, 1, 2, 0])).toEqual({
      ok: false,
      error: { code: 'repeatedVertex', index: 3, vertex: 0 },
    });
  });

  it('rejects a jump between sprouts without a vine', () => {
    expect(checkAlternatingPath(graph, matching, [0, 1, 3])).toEqual({
      ok: false,
      error: { code: 'notAdjacent', index: 1 },
    });
  });

  it('rejects two dark vines in a row', () => {
    expect(checkAlternatingPath(graph, matching, [1, 0, 2, 3])).toEqual({
      ok: false,
      error: { code: 'notAlternating', index: 1 },
    });
  });
});

describe('checkAugmentingPath (a winning chain)', () => {
  it('accepts a chain between two sprouts in the dark', () => {
    expect(checkAugmentingPath(graph, matching, [0, 1, 2, 3, 4, 5]).ok).toBe(true);
  });

  it('rejects a lone sprout: a chain needs at least one vine', () => {
    expect(checkAugmentingPath(graph, matching, [0])).toEqual({
      ok: false,
      error: { code: 'tooShort' },
    });
  });

  it('rejects a chain that starts at a lit sprout', () => {
    expect(checkAugmentingPath(graph, matching, [2, 1, 0])).toEqual({
      ok: false,
      error: { code: 'endpointNotExposed', vertex: 2 },
    });
  });

  it('rejects a chain that ends at a lit sprout', () => {
    expect(checkAugmentingPath(graph, matching, [0, 1, 2, 3, 4])).toEqual({
      ok: false,
      error: { code: 'endpointNotExposed', vertex: 4 },
    });
  });

  it('propagates alternation errors', () => {
    expect(checkAugmentingPath(graph, matching, [0, 2, 1]).ok).toBe(false);
  });

  it('property: every free vine is a one-step winning chain', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([g, m]) => {
        for (const [u, v] of freeEdges(g, m))
          expect(checkAugmentingPath(g, m, [u, v]).ok).toBe(true);
      }),
    );
  });
});

describe('checkStem (even alternating path from a sprout in the dark)', () => {
  it('accepts the root alone (a stem of length zero)', () => {
    expect(checkStem(graph, matching, [0]).ok).toBe(true);
  });

  it('accepts a stem ending with a lantern', () => {
    expect(checkStem(graph, matching, [0, 1, 2]).ok).toBe(true);
  });

  it('rejects a stem that starts at a lit sprout', () => {
    expect(checkStem(graph, matching, [1, 2])).toEqual({
      ok: false,
      error: { code: 'endpointNotExposed', vertex: 1 },
    });
  });

  it('rejects a stem of odd length', () => {
    expect(checkStem(graph, matching, [0, 1])).toEqual({
      ok: false,
      error: { code: 'wrongParity', edges: 1 },
    });
  });

  it('propagates alternation errors', () => {
    expect(checkStem(graph, matching, []).ok).toBe(false);
  });

  it('property: every lit vine is an alternating path starting matched', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([g, m]) => {
        for (const [u, v] of matchedEdges(m)) {
          expect(unwrap(checkAlternatingPath(g, m, [u, v])).firstEdgeMatched).toBe(true);
        }
      }),
    );
  });
});
