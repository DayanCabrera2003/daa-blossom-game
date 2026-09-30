import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb, graphWithVertexArb } from '../../../tests/support/arbitraries';
import { InvariantError } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { createGraph } from './createGraph';
import { degree, edgeKey, hasEdge, neighbors } from './queries';

// Triangle 0-1-2 plus the pendant edge 2-3.
const graph = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [0, 2],
    [2, 3],
  ]),
);

describe('graph queries', () => {
  it('neighbors lists adjacent vertices in ascending order', () => {
    expect(neighbors(graph, 2)).toEqual([0, 1, 3]);
  });

  it('degree counts neighbors', () => {
    expect([0, 1, 2, 3].map((v) => degree(graph, v))).toEqual([2, 2, 3, 1]);
  });

  it('hasEdge is symmetric and false for non-edges', () => {
    expect(hasEdge(graph, 2, 3)).toBe(true);
    expect(hasEdge(graph, 3, 2)).toBe(true);
    expect(hasEdge(graph, 0, 3)).toBe(false);
    expect(hasEdge(graph, 1, 1)).toBe(false);
  });

  it('edgeKey ignores orientation', () => {
    expect(edgeKey(3, 1)).toBe(edgeKey(1, 3));
    expect(edgeKey(1, 3)).not.toBe(edgeKey(1, 2));
  });

  it('rejects vertices outside the graph', () => {
    expect(() => neighbors(graph, 4)).toThrow(InvariantError);
    expect(() => hasEdge(graph, -1, 0)).toThrow(InvariantError);
  });

  it('property: the degree sum is twice the number of edges (handshake lemma)', () => {
    fc.assert(
      fc.property(graphArb(), (g) => {
        let sum = 0;
        for (let v = 0; v < g.n; v++) sum += degree(g, v);
        expect(sum).toBe(2 * g.edges.length);
      }),
    );
  });

  it('property: hasEdge agrees with the edge list', () => {
    fc.assert(
      fc.property(graphWithVertexArb(), ([g, u]) => {
        for (let v = 0; v < g.n; v++) {
          const listed = g.edges.some(([a, b]) => edgeKey(a, b) === edgeKey(u, v));
          expect(hasEdge(g, u, v)).toBe(listed);
        }
      }),
    );
  });
});
