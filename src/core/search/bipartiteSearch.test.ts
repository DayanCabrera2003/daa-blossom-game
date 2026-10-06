import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bipartiteWithMatchingArb, graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { expectForestInvariants } from '../../../tests/support/forestInvariants';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import type { TraceEvent } from '../trace/events';
import { createRecorder } from '../trace/recorder';
import { bipartiteSearch } from './bipartiteSearch';

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const fog = pathGraph(6);
const fogLanterns = unwrap(
  createMatching(fog, [
    [1, 2],
    [3, 4],
  ]),
);

// Level 3.6: 1–2=3–4=5 with 1 in the dark, as 0–1=2–3=4.
const noChain = pathGraph(5);
const noChainLanterns = unwrap(
  createMatching(noChain, [
    [1, 2],
    [3, 4],
  ]),
);

// Level 4.1: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5.
const festivalEdges: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [2, 4],
  [3, 5],
];
const festival = unwrap(createGraph(6, festivalEdges));
const festivalLanterns = unwrap(
  createMatching(festival, [
    [1, 2],
    [3, 4],
  ]),
);

// The same flower with its stem but without the exit to e: R–a=b, triangle b–c=d–b.
const flower = unwrap(createGraph(5, festivalEdges.slice(0, 5)));
const flowerLanterns = unwrap(
  createMatching(flower, [
    [1, 2],
    [3, 4],
  ]),
);

const labelEvents = (events: readonly TraceEvent[]) =>
  events.filter((event) => event.type === 'labelOuter' || event.type === 'labelInner');

describe('bipartite search', () => {
  it('finds the chain of the fog, both ends growing towards each other', () => {
    const outcome = unwrap(bipartiteSearch(fog, fogLanterns));
    expect(outcome.kind).toBe('augmentingPath');
    if (outcome.kind !== 'augmentingPath') return;
    expect(outcome.path).toEqual([0, 1, 2, 3, 4, 5]);
    expect(checkAugmentingPath(fog, fogLanterns, outcome.path).ok).toBe(true);
  });

  it('records the search: roots first, then each scan and the marks it causes', () => {
    const recorder = createRecorder();
    bipartiteSearch(fog, fogLanterns, recorder);
    expect(recorder.events.slice(0, 6)).toEqual([
      { type: 'searchStart', roots: [0, 5] },
      { type: 'labelOuter', vertex: 0, parent: null, root: 0 },
      { type: 'labelOuter', vertex: 5, parent: null, root: 5 },
      { type: 'scanEdge', from: 0, to: 1 },
      { type: 'labelInner', vertex: 1, parent: 0, root: 0 },
      { type: 'labelOuter', vertex: 2, parent: 1, root: 0 },
    ]);
  });

  it('ends without a chain when there is none, and says so (level 3.6)', () => {
    const recorder = createRecorder();
    const outcome = unwrap(bipartiteSearch(noChain, noChainLanterns, recorder));
    expect(outcome.kind).toBe('noPath');
    expect(outcome.forest.label).toEqual(['outer', 'inner', 'outer', 'inner', 'outer']);
    expect(recorder.events.at(-1)).toEqual({ type: 'searchFailed' });
  });

  it('in the festival of level 4.1 the whole forest still finds the chain through e', () => {
    // The betrayal of 4.1 happens to the player searching from R alone; the algorithm also grows
    // a tree from e, which reaches d, so b–d joins suns of different trees.
    const outcome = unwrap(bipartiteSearch(festival, festivalLanterns));
    expect(outcome).toMatchObject({ kind: 'augmentingPath', path: [0, 1, 2, 4, 3, 5] });
  });

  it('a flower with no way out is an odd cycle it cannot handle: it reports the conflict', () => {
    const recorder = createRecorder();
    const result = bipartiteSearch(flower, flowerLanterns, recorder);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({ code: 'oddCycleConflict', from: 2, to: 4 });
    // The partial trace survives for the game to animate the conflict.
    expect(recorder.events.at(-1)).toEqual({ type: 'scanEdge', from: 2, to: 4 });
  });

  it('property: in bees and flowers there is never a conflict', () => {
    fc.assert(
      fc.property(bipartiteWithMatchingArb(), ([graph, matching]) => {
        expect(bipartiteSearch(graph, matching).ok).toBe(true);
      }),
    );
  });

  it('property: a chain is augmenting, and no chain means the matching is maximum', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), ([graph, matching]) => {
        const result = bipartiteSearch(graph, matching);
        if (!result.ok) return;
        const outcome = result.value;
        expectForestInvariants(graph, matching, outcome.forest);
        if (outcome.kind === 'augmentingPath') {
          expect(checkAugmentingPath(graph, matching, outcome.path).ok).toBe(true);
        } else {
          const best = bruteForceMatching(graph);
          if (best.status === 'complete') expect(size(matching)).toBe(size(best.matching));
        }
      }),
    );
  });

  it('property: each sprout is marked at most once per search, exactly as the forest shows', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const recorder = createRecorder();
        const result = bipartiteSearch(graph, matching, recorder);
        const marked = labelEvents(recorder.events).map((event) => event.vertex);
        expect(new Set(marked).size).toBe(marked.length);
        if (result.ok) {
          const inForest = result.value.forest.label.flatMap((label, v) =>
            label === 'none' ? [] : [v],
          );
          expect([...marked].sort((a, b) => a - b)).toEqual(inForest);
        }
      }),
    );
  });
});
