import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { expectForestInvariants } from '../../../tests/support/forestInvariants';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { neighbors } from '../graph/queries';
import { createMatching } from '../matching/createMatching';
import { exposedVertices } from '../matching/queries';
import { unwrap } from '../shared/result';
import { plantForest, type AlternatingForest } from './forest';
import { growStep, type GrowthStep } from './growForest';

/** The forest of a step that must grow; anything else is a test bug. */
const grown = (step: GrowthStep): AlternatingForest => {
  if (step.kind !== 'grow') throw new Error(`expected growth, got ${step.kind}`);
  return step.forest;
};

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const fog = pathGraph(6);
const fogLanterns = unwrap(
  createMatching(fog, [
    [1, 2],
    [3, 4],
  ]),
);

// Level 4.1: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5.
const festival = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const festivalLanterns = unwrap(
  createMatching(festival, [
    [1, 2],
    [3, 4],
  ]),
);

describe('one step of forest growth', () => {
  it('a sun reaching an unmarked lit sprout makes it a moon and its partner a sun', () => {
    const start = plantForest(fogLanterns, [0]);
    const step = growStep(fogLanterns, start, 0, 1);
    expect(step).toMatchObject({ kind: 'grow', inner: 1, outer: 2 });
    const forest = grown(step);
    expect(forest.label.slice(0, 3)).toEqual(['outer', 'inner', 'outer']);
    expect(forest.parent.slice(0, 3)).toEqual([-1, 0, 1]);
    expect(forest.root.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it('never touches the forest it grows from', () => {
    const start = plantForest(fogLanterns, [0]);
    growStep(fogLanterns, start, 0, 1);
    expect(start.label[1]).toBe('none');
  });

  it('a lonely moon at the end of the walk is a chain (level 3.1)', () => {
    let forest = plantForest(fogLanterns, [0]);
    forest = grown(growStep(fogLanterns, forest, 0, 1));
    forest = grown(growStep(fogLanterns, forest, 2, 3));
    expect(growStep(fogLanterns, forest, 4, 5)).toEqual({
      kind: 'chain',
      path: [0, 1, 2, 3, 4, 5],
    });
  });

  it('two suns of different trees touching is a chain from root to root (level 3.4)', () => {
    let forest = plantForest(fogLanterns, [0, 5]);
    forest = grown(growStep(fogLanterns, forest, 0, 1));
    forest = grown(growStep(fogLanterns, forest, 5, 4));
    expect(growStep(fogLanterns, forest, 2, 3)).toEqual({
      kind: 'chain',
      path: [0, 1, 2, 3, 4, 5],
    });
    expect(growStep(fogLanterns, forest, 0, 1)).toEqual({ kind: 'alreadyInner' });
  });

  it('a moon already marked is left as it is (level 3.3)', () => {
    let forest = plantForest(fogLanterns, [0]);
    forest = grown(growStep(fogLanterns, forest, 0, 1));
    expect(growStep(fogLanterns, forest, 2, 1)).toEqual({ kind: 'alreadyInner' });
  });

  it('two suns of the same tree touching is an odd cycle, the betrayal (level 4.1)', () => {
    let forest = plantForest(festivalLanterns, [0, 5]);
    forest = grown(growStep(festivalLanterns, forest, 0, 1));
    forest = grown(growStep(festivalLanterns, forest, 2, 3));
    expect(growStep(festivalLanterns, forest, 4, 2)).toEqual({ kind: 'oddCycle', from: 4, to: 2 });
  });

  it('only a sun may look along its vines', () => {
    const start = plantForest(fogLanterns, [0]);
    expect(() => growStep(fogLanterns, start, 1, 2)).toThrow();
  });

  it('property: any sequence of growth steps keeps the forest invariants', () => {
    fc.assert(
      fc.property(
        graphWithMatchingArb({ maxN: 10 }),
        fc.array(fc.nat(), { maxLength: 30 }),
        ([graph, matching], picks) => {
          let forest = plantForest(matching, exposedVertices(matching));
          expectForestInvariants(graph, matching, forest);
          for (const pick of picks) {
            const scans: [number, number][] = [];
            forest.label.forEach((label, u) => {
              if (label === 'outer') for (const x of neighbors(graph, u)) scans.push([u, x]);
            });
            if (scans.length === 0) break;
            const [u, x] = scans[pick % scans.length] as [number, number];
            const step = growStep(matching, forest, u, x);
            if (step.kind === 'grow') forest = step.forest;
            expectForestInvariants(graph, matching, forest);
          }
        },
      ),
    );
  });
});
