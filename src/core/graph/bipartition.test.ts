import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphArb } from '../../../tests/support/arbitraries';
import { unwrap } from '../shared/result';
import { bipartition } from './bipartition';
import { createGraph } from './createGraph';
import { hasEdge } from './queries';
import type { Edge, Graph } from './types';

const build = (n: number, edges: Edge[]): Graph => unwrap(createGraph(n, edges));

/** A cycle witness is valid if it is odd, simple, and every consecutive pair (cyclically) is an edge. */
function expectValidOddCycle(graph: Graph, cycle: readonly number[]): void {
  expect(cycle.length % 2).toBe(1);
  expect(cycle.length).toBeGreaterThanOrEqual(3);
  expect(new Set(cycle).size).toBe(cycle.length);
  cycle.forEach((v, i) => {
    expect(hasEdge(graph, v, cycle[(i + 1) % cycle.length] as number)).toBe(true);
  });
}

describe('bipartition', () => {
  it('two-colours an even cycle', () => {
    const square = build(4, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ]);
    expect(bipartition(square)).toEqual({ kind: 'bipartite', side: [0, 1, 0, 1] });
  });

  it('colours each component starting from side 0 at its smallest vertex', () => {
    const twoEdges = build(4, [
      [0, 1],
      [2, 3],
    ]);
    expect(bipartition(twoEdges)).toEqual({ kind: 'bipartite', side: [0, 1, 0, 1] });
  });

  it('finds the triangle in a triangle', () => {
    const result = bipartition(
      build(3, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
    );
    expect(result.kind).toBe('oddCycle');
    if (result.kind === 'oddCycle') expect([...result.cycle].sort()).toEqual([0, 1, 2]);
  });

  it('finds the odd cycle of level 4.1 (the betrayal): b, c, d', () => {
    // R=0, a=1, b=2, c=3, d=4, e=5 with vines R–a, a–b, b–c, c–d, d–b, c–e.
    const festival = build(6, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 2],
      [3, 5],
    ]);
    const result = bipartition(festival);
    expect(result.kind).toBe('oddCycle');
    if (result.kind === 'oddCycle') {
      expectValidOddCycle(festival, result.cycle);
      expect([...result.cycle].sort()).toEqual([2, 3, 4]);
    }
  });

  it('property: returns either a proper two-colouring or a valid odd cycle', () => {
    fc.assert(
      fc.property(graphArb(), (g) => {
        const result = bipartition(g);
        if (result.kind === 'bipartite') {
          expect(result.side).toHaveLength(g.n);
          for (const [u, v] of g.edges) expect(result.side[u]).not.toBe(result.side[v]);
        } else {
          expectValidOddCycle(g, result.cycle);
        }
      }),
    );
  });

  it('property: graphs with every edge between even and odd ids are bipartite', () => {
    fc.assert(
      fc.property(graphArb(), (g) => {
        const crossing = g.edges.filter(([u, v]) => (u + v) % 2 === 1);
        expect(bipartition(build(g.n, crossing)).kind).toBe('bipartite');
      }),
    );
  });
});
