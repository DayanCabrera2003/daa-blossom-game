import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { expectForestInvariants } from '../../../tests/support/forestInvariants';
import { expandPath } from '../blossom/expand';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import type { TraceEvent } from '../trace/events';
import { createRecorder } from '../trace/recorder';
import { searchWithFlowers } from './search';

const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

const ofType = <T extends TraceEvent['type']>(events: readonly TraceEvent[], type: T) =>
  events.filter((event): event is Extract<TraceEvent, { type: T }> => event.type === type);

const sprouts = (...vertices: number[]) => vertices.map((vertex) => ({ kind: 'sprout', vertex }));

// Level 4.9: R–a=b, triangle b–c=d–b, no way out. R a b c d = 0 1 2 3 4.
const closed = unwrap(
  createGraph(5, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
  ]),
);
const closedLanterns = unwrap(
  createMatching(closed, [
    [1, 2],
    [3, 4],
  ]),
);

// Level 5.1: R a b c d g h t = 0 1 2 3 4 5 6 7.
const wild = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
    [5, 6],
    [0, 6],
    [1, 7],
  ]),
);
const wildLanterns = unwrap(
  createMatching(wild, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

describe('search with flowers', () => {
  it('folds the triangle and then, honestly, finds no chain (level 4.9)', () => {
    const recorder = createRecorder();
    const outcome = searchWithFlowers(closed, closedLanterns, recorder);
    expect(outcome.kind).toBe('noPath');
    if (outcome.kind !== 'noPath') return;
    expect(outcome.layer.nodes.length).toBe(3);
    expect(outcome.forest.label).toEqual(['outer', 'inner', 'outer']);
    expect(ofType(recorder.events, 'oddCycleFound')).toEqual([
      { type: 'oddCycleFound', vine: [2, 4] },
    ]);
    expect(ofType(recorder.events, 'contract')).toEqual([
      { type: 'contract', blossom: 0, base: 2, cycle: sprouts(2, 4, 3) },
    ]);
    expect(recorder.events.at(-1)).toEqual({ type: 'searchFailed' });
  });

  it('folds a flower inside another and reaches t through both (level 5.1)', () => {
    const recorder = createRecorder();
    const outcome = searchWithFlowers(wild, wildLanterns, recorder);
    expect(outcome.kind).toBe('augmentingPath');
    if (outcome.kind !== 'augmentingPath') return;
    expect(ofType(recorder.events, 'contract')).toEqual([
      { type: 'contract', blossom: 0, base: 2, cycle: sprouts(2, 4, 3) },
      {
        type: 'contract',
        blossom: 1,
        base: 0,
        cycle: [...sprouts(0, 6, 5), { kind: 'blossom', id: 0 }, ...sprouts(1)],
      },
    ]);
    expect(expandPath(outcome.layer, outcome.path)).toEqual([0, 6, 5, 3, 4, 2, 1, 7]);
  });

  it('scans from a flower along the real vine it uses', () => {
    const recorder = createRecorder();
    searchWithFlowers(closed, closedLanterns, recorder);
    // After folding, the flower looks along b–a again, named by its original sprouts.
    expect(ofType(recorder.events, 'scanEdge').at(-1)).toEqual({
      type: 'scanEdge',
      from: 2,
      to: 1,
    });
  });

  it('property: a chain found unfolds to a chain of the garden', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const outcome = searchWithFlowers(graph, matching);
        if (outcome.kind !== 'augmentingPath') return;
        const path = expandPath(outcome.layer, outcome.path);
        expect(checkAugmentingPath(graph, matching, path).ok).toBe(true);
      }),
    );
  });

  it('property: no chain means the matching is maximum, with a valid final forest', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, matching]) => {
        const outcome = searchWithFlowers(graph, matching);
        if (outcome.kind !== 'noPath') return;
        expectForestInvariants(outcome.layer.graph, outcome.layer.matching, outcome.forest);
        expect(size(matching)).toBe(optimum(graph));
      }),
    );
  });

  it('property: every sprout is marked at most once and each fold shrinks the garden', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const recorder = createRecorder();
        searchWithFlowers(graph, matching, recorder);
        const marked = recorder.events.flatMap((event) =>
          event.type === 'labelOuter' || event.type === 'labelInner' ? [event.vertex] : [],
        );
        expect(new Set(marked).size).toBe(marked.length);
        // Each fold removes at least two nodes, so a search folds fewer than n/2 times.
        expect(ofType(recorder.events, 'contract').length).toBeLessThanOrEqual(graph.n / 2);
      }),
    );
  });
});
