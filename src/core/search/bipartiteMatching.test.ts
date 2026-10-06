import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bipartiteGraphArb,
  bipartiteWithMatchingArb,
  graphArb,
} from '../../../tests/support/arbitraries';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import { validateMate } from '../matching/validate';
import { unwrap } from '../shared/result';
import { createRecorder } from '../trace/recorder';
import { bipartiteMatching } from './bipartiteMatching';

/** Bruto's answer size; the graphs here are small enough for him to finish. */
const optimum = (graph: Graph): number => {
  const outcome = bruteForceMatching(graph);
  if (outcome.status !== 'complete') throw new Error('brute force gave up');
  return size(outcome.matching);
};

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const fog = pathGraph(6);
const fogLanterns = unwrap(
  createMatching(fog, [
    [1, 2],
    [3, 4],
  ]),
);

describe('bipartite matching', () => {
  it('passes lanterns along each chain until none is left (level 3.1)', () => {
    const recorder = createRecorder();
    const run = unwrap(bipartiteMatching(fog, fogLanterns, recorder));
    expect(size(run.matching)).toBe(3);
    expect(recorder.events.filter((event) => event.type === 'augment')).toEqual([
      { type: 'augment', path: [0, 1, 2, 3, 4, 5] },
    ]);
    expect(recorder.events.slice(-2)).toEqual([
      { type: 'searchFailed' },
      { type: 'done', size: 3 },
    ]);
  });

  it('starts from a garden in the dark by default', () => {
    expect(size(unwrap(bipartiteMatching(fog)).matching)).toBe(3);
  });

  it('gives up with the conflict when an odd cycle blocks the search', () => {
    // A triangle with a stem: R–a=b, b–c=d–b; started from the matching a=b, c=d.
    const flower = unwrap(
      createGraph(5, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
      ]),
    );
    const lanterns = unwrap(
      createMatching(flower, [
        [1, 2],
        [3, 4],
      ]),
    );
    expect(bipartiteMatching(flower, lanterns)).toMatchObject({
      ok: false,
      error: { code: 'oddCycleConflict' },
    });
  });

  it('property: in bees and flowers it always reaches the maximum (checked by Bruto)', () => {
    fc.assert(
      fc.property(bipartiteGraphArb(), (graph) => {
        const run = unwrap(bipartiteMatching(graph));
        expect(validateMate(graph, run.matching.mate).ok).toBe(true);
        expect(size(run.matching)).toBe(optimum(graph));
      }),
    );
  });

  it('property: each chain lights exactly one more lantern', () => {
    fc.assert(
      fc.property(bipartiteWithMatchingArb(), ([graph, initial]) => {
        const recorder = createRecorder();
        const run = unwrap(bipartiteMatching(graph, initial, recorder));
        const chains = recorder.events.filter((event) => event.type === 'augment').length;
        expect(size(run.matching)).toBe(size(initial) + chains);
      }),
    );
  });

  it('property: on any garden it either reports a conflict or is maximum, never wrong', () => {
    fc.assert(
      fc.property(graphArb({ maxN: 9 }), (graph) => {
        const result = bipartiteMatching(graph);
        if (result.ok) expect(size(result.value.matching)).toBe(optimum(graph));
      }),
    );
  });
});
