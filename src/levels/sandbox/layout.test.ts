import { bipartition } from '@core/graph/bipartition';
import type { Graph } from '@core/graph/types';
import { randomBipartiteGraph } from '@core/generators/bipartite';
import { completeGraph, cycleGraph, pathGraph, starGraph } from '@core/generators/families';
import { helix, longStemFlower, manyFlowers, nestedFlowers } from '@core/generators/hardCases';
import { randomGraph } from '@core/generators/random';
import { createRng } from '@core/shared/rng';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { crossingCount, readingProblems } from '../../../tests/support/gardenReading';
import { LAYOUT_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { SPROUT_AREA } from '../fields';
import { layoutGarden, type LayoutShape, type Spot } from './layout';
import { MAX_VINES, MIN_SPACING } from './limits';

/**
 * Whether a layout of `graph` puts every sprout on a whole pixel inside the garden, 18 px apart,
 * with no name drawn over a sprout, another name or a lantern: the checks of the catalog's levels,
 * with no exemption.
 */
function expectReadable(spots: readonly Spot[], graph: Graph): void {
  expect(spots).toHaveLength(graph.n);
  expect(readingProblems(graph, spots)).toEqual([]);
  spots.forEach((spot, i) => {
    expect(Number.isInteger(spot.x) && Number.isInteger(spot.y)).toBe(true);
    expect(spot.x).toBeGreaterThanOrEqual(SPROUT_AREA.x0);
    expect(spot.x).toBeLessThanOrEqual(SPROUT_AREA.x1);
    expect(spot.y).toBeGreaterThanOrEqual(SPROUT_AREA.y0);
    expect(spot.y).toBeLessThanOrEqual(SPROUT_AREA.y1);
    for (const other of spots.slice(i + 1)) {
      expect(Math.hypot(spot.x - other.x, spot.y - other.y)).toBeGreaterThanOrEqual(MIN_SPACING);
    }
  });
}

/** The two sides of a garden of bees and flowers grown with `a` bees first. */
const beesFirst = (a: number, n: number): (0 | 1)[] =>
  Array.from({ length: n }, (_, v) => (v < a ? 0 : 1));

/** Each generator of the free mode (plan 08, section 1.3) at the largest size it offers. */
const LARGEST: readonly [string, Graph, LayoutShape][] = [
  ['row of 20', pathGraph(20), { kind: 'row' }],
  ['ring of 20', cycleGraph(20), { kind: 'ring' }],
  ['star of 12 leaves', starGraph(12), { kind: 'layers' }],
  ['all with all, 8', completeGraph(8), { kind: 'ring' }],
  ['random, 20', randomGraph(20, 0.5, createRng(1)), { kind: 'ring' }],
  [
    'bees and flowers, 20',
    randomBipartiteGraph(10, 10, 0.5, createRng(1)),
    { kind: 'sides', side: beesFirst(10, 20) },
  ],
  [
    'bees and flowers, 17 and 3',
    randomBipartiteGraph(17, 3, 0.5, createRng(2)),
    { kind: 'sides', side: beesFirst(17, 20) },
  ],
  ['long stem 6', longStemFlower(6).graph, { kind: 'layers' }],
  ['nested flowers 4', nestedFlowers(4).graph, { kind: 'layers' }],
  ['helix of 5 arms', helix(5).graph, { kind: 'layers' }],
  ['many flowers 5', manyFlowers(5).graph, { kind: 'layers' }],
  ['24 alone', randomGraph(24, 0, createRng(1)), { kind: 'layers' }],
  ['24 in a row', pathGraph(24), { kind: 'row' }],
  ['24 in a ring', cycleGraph(24), { kind: 'ring' }],
];

/** How far each sprout is from R (sprout 0) along the vines; -1 when it cannot be reached. */
function depthsFromR(graph: Graph): number[] {
  const depth = new Array<number>(graph.n).fill(-1);
  depth[0] = 0;
  const queue = [0];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head] ?? 0;
    for (const v of graph.adjacency[u] ?? []) {
      if (depth[v] !== -1) continue;
      depth[v] = (depth[u] ?? 0) + 1;
      queue.push(v);
    }
  }
  return depth;
}

describe('laying out a garden without places', () => {
  it.each(LARGEST)('keeps %s inside the garden and its sprouts apart', (_, graph, shape) => {
    expectReadable(layoutGarden(graph, shape), graph);
  });

  it('lays out no sprout, or one, too', () => {
    expect(layoutGarden(pathGraph(0), { kind: 'ring' })).toEqual([]);
    for (const kind of ['row', 'ring', 'layers'] as const) {
      expectReadable(layoutGarden(pathGraph(1), { kind }), pathGraph(1));
    }
  });

  it('lays out the same garden the same way every time', () => {
    for (const [, graph, shape] of LARGEST) {
      expect(layoutGarden(graph, shape)).toEqual(layoutGarden(graph, shape));
    }
  });

  it('lays a row and a ring of any size out without a vine crossing another', () => {
    for (let n = 2; n <= 24; n++) {
      expect(crossingCount(pathGraph(n), layoutGarden(pathGraph(n), { kind: 'row' }))).toBe(0);
    }
    for (let n = 3; n <= 24; n++) {
      expect(crossingCount(cycleGraph(n), layoutGarden(cycleGraph(n), { kind: 'ring' }))).toBe(0);
    }
  });

  it("spreads the layers of a deep garden over most of the garden's height", () => {
    const spots = layoutGarden(nestedFlowers(4).graph, { kind: 'layers' });
    const ys = spots.map(({ y }) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(
      (SPROUT_AREA.y1 - SPROUT_AREA.y0) / 2,
    );
  });

  it('walks a row from left to right', () => {
    const spots = layoutGarden(pathGraph(12), { kind: 'row' });
    spots.slice(1).forEach((spot, i) => expect(spot.x).toBeGreaterThan(spots[i]?.x ?? 0));
  });

  it('puts the bees on the left and the flowers on the right', () => {
    const side = beesFirst(7, 12);
    const spots = layoutGarden(randomBipartiteGraph(7, 5, 0.4, createRng(4)), {
      kind: 'sides',
      side,
    });
    const xs = (s: 0 | 1): number[] => spots.filter((_, v) => side[v] === s).map(({ x }) => x);
    expect(Math.max(...xs(0))).toBeLessThan(Math.min(...xs(1)));
  });

  it('lays flowers out by their distance from R, from left to right', () => {
    for (const graph of [nestedFlowers(3).graph, manyFlowers(4).graph, longStemFlower(5).graph]) {
      const spots = layoutGarden(graph, { kind: 'layers' });
      const depth = depthsFromR(graph);
      for (let u = 0; u < graph.n; u++) {
        for (let v = 0; v < graph.n; v++) {
          if ((depth[u] ?? 0) < (depth[v] ?? 0)) {
            expect(spots[u]?.x ?? 0).toBeLessThan(spots[v]?.x ?? 0);
          }
        }
      }
    }
  });

  it(
    'property: any garden of the free mode, in any shape, stays readable',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 24 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer(),
          fc.constantFrom('row', 'ring', 'layers', 'sides'),
          (n, chance, seed, kind) => {
            // About 48 vines at the most likely, so the limit of 40 skips few gardens.
            const p = chance * Math.min(0.6, 96 / Math.max(1, n * (n - 1)));
            const graph = randomGraph(n, p, createRng(seed));
            // The free mode holds 40 vines at most: a garden with more never gets laid out.
            fc.pre(graph.edges.length <= MAX_VINES);
            const sides = bipartition(graph);
            const shape: LayoutShape =
              kind === 'sides'
                ? {
                    kind,
                    side: sides.kind === 'bipartite' ? sides.side : beesFirst(n >> 1, n),
                  }
                : { kind };
            expectReadable(layoutGarden(graph, shape), graph);
          },
        ),
        { numRuns: 150 },
      );
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it('refuses a garden larger than the free mode holds', () => {
    expect(() => layoutGarden(pathGraph(25), { kind: 'ring' })).toThrow();
    expect(() => layoutGarden(pathGraph(3), { kind: 'sides', side: [0, 1] })).toThrow();
  });
});
