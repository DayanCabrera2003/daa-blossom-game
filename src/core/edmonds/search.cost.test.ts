import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import type { Edge, Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import type { Matching } from '../matching/types';
import { unwrap } from '../shared/result';
import type { AlternatingForest } from '../search/forest';
import { createRecorder } from '../trace/recorder';
import { searchWithFlowers } from './search';

/**
 * The cost of the search itself, measured from outside (Códex C11, Proposition 11.2(2)): an
 * ordinary examination of a vine (cases b and e of Algorithm 10.1) must cost O(1) amortised, so
 * the climbs to a root are only built when a chain or a flower is found, and the original vine
 * behind a folded one is not searched for again on every examination.
 */

// Every climb to a root the search builds, measured in sprouts: the real function, counted.
const probe = vi.hoisted(() => ({ climbed: 0 }));
vi.mock('../search/pathToRoot', async (importOriginal) => {
  const actual = await importOriginal<{
    pathToRoot: (forest: AlternatingForest, v: number) => number[];
  }>();
  return {
    pathToRoot: (forest: AlternatingForest, v: number): number[] => {
      const path = actual.pathToRoot(forest, v);
      probe.climbed += path.length;
      return path;
    },
  };
});

beforeEach(() => {
  probe.climbed = 0;
});

/** The garden `graph` with every reading of a neighbor list counted in `reads.count`. */
function countingReads(graph: Graph): { graph: Graph; reads: { count: number } } {
  const reads = { count: 0 };
  const adjacency = graph.adjacency.map(
    (list) =>
      new Proxy(list, {
        get(target, key, receiver) {
          if (typeof key === 'string' && /^\d+$/.test(key)) reads.count++;
          return Reflect.get(target, key, receiver) as unknown;
        },
      }),
  );
  return { graph: { ...graph, adjacency }, reads };
}

/** Builds a garden and its lanterns from edge lists. */
function garden(n: number, edges: Edge[], lit: Edge[]): { graph: Graph; matching: Matching } {
  const graph = unwrap(createGraph(n, edges));
  return { graph, matching: unwrap(createMatching(graph, lit)) };
}

/** R = 0 then k lit pairs in a row, R–1=2–3=4–…=2k: one tree as deep as the garden, no chain. */
function longClimb(k: number) {
  const edges: Edge[] = Array.from({ length: 2 * k }, (_, i) => [i, i + 1]);
  const lit: Edge[] = Array.from({ length: k }, (_, i) => [2 * i + 1, 2 * i + 2]);
  return garden(2 * k + 1, edges, lit);
}

/** R = 0 joined to k moons 1, 3, …, 2k − 1, each lit to a sun 2, 4, …, 2k that leads nowhere. */
function fan(k: number) {
  const edges: Edge[] = [];
  const lit: Edge[] = [];
  for (let i = 0; i < k; i++) {
    edges.push([0, 2 * i + 1], [2 * i + 1, 2 * i + 2]);
    lit.push([2 * i + 1, 2 * i + 2]);
  }
  return garden(2 * k + 1, edges, lit);
}

/** Number of folds a search recorded. */
const foldsOf = (graph: Graph, matching: Matching): number => {
  const recorder = createRecorder();
  searchWithFlowers(graph, matching, recorder);
  return recorder.events.filter((event) => event.type === 'contract').length;
};

describe('the cost of a search with flowers', () => {
  it('climbs to the root only to build a chain or a flower, never on an ordinary vine', () => {
    for (const k of [10, 100, 400]) {
      const { graph, matching } = longClimb(k);
      probe.climbed = 0;
      expect(searchWithFlowers(graph, matching).kind).toBe('noPath');
      // 2k examinations at depths up to 2k: rebuilding the climb on each would cost about 2k².
      expect(probe.climbed).toBe(0);
    }
  });

  it('builds climbs of at most n sprouts per fold, plus the two halves of the chain', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const folds = foldsOf(graph, matching);
        probe.climbed = 0;
        searchWithFlowers(graph, matching);
        expect(probe.climbed).toBeLessThanOrEqual(2 * graph.n * (folds + 1));
      }),
    );
  });

  it('finds the original vine behind each examined one in O(1) amortised reads', () => {
    for (const k of [10, 100, 400]) {
      const { graph, matching } = fan(k);
      const counted = countingReads(graph);
      expect(searchWithFlowers(counted.graph, matching).kind).toBe('noPath');
      // n = 2k + 1 and m = 2k; looking for each of R's k vines again from scratch costs about k²/2.
      expect(counted.reads.count).toBeLessThanOrEqual(4 * (graph.n + 2 * graph.edges.length));
    }
  });

  it('reads the neighbor lists O(n + m) times per fold', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const folds = foldsOf(graph, matching);
        const counted = countingReads(graph);
        searchWithFlowers(counted.graph, matching);
        const size = graph.n + 2 * graph.edges.length;
        expect(counted.reads.count).toBeLessThanOrEqual(4 * size * (folds + 1));
      }),
    );
  });
});
