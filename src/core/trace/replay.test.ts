import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithDensityArb, matchingArb } from '../../../tests/support/arbitraries';
import { members } from '../blossom/hierarchy';
import { edmonds } from '../edmonds/solve';
import { createGraph } from '../graph/createGraph';
import { createMatching, emptyMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { stateAt } from './replay';

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
const lanterns = unwrap(
  createMatching(wild, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);
const run = edmonds(wild, lanterns);
const indexOf = (type: string, from = 0) =>
  run.trace.findIndex((event, i) => i >= from && event.type === type);

describe('replaying a trace (the sun slider)', () => {
  it('at dawn the garden is as it started: its lanterns, no marks, no flowers', () => {
    expect(stateAt(lanterns, run.trace, 0)).toEqual({
      mate: lanterns.mate,
      label: new Array(8).fill('none'),
      flowers: [],
    });
  });

  it('after the first fold, b, c and d are one flower and all of them shine as suns', () => {
    const state = stateAt(lanterns, run.trace, indexOf('contract') + 1);
    expect(state.flowers).toEqual([{ id: 0, base: 2, members: [2, 3, 4], parent: null }]);
    expect([2, 3, 4].map((v) => state.label[v])).toEqual(['outer', 'outer', 'outer']);
  });

  it('the second fold swallows the first: F1 now lives inside F2 (the Layers view)', () => {
    const second = indexOf('contract', indexOf('contract') + 1);
    expect(stateAt(lanterns, run.trace, second + 1).flowers).toEqual([
      { id: 0, base: 2, members: [2, 3, 4], parent: 1 },
      { id: 1, base: 0, members: [0, 1, 2, 3, 4, 5, 6], parent: null },
    ]);
  });

  it('opening F2 leaves F1 on top, and passing the lanterns lights four', () => {
    const opened = stateAt(lanterns, run.trace, indexOf('expand') + 1);
    expect(opened.flowers).toEqual([{ id: 0, base: 2, members: [2, 3, 4], parent: null }]);
    const lit = stateAt(lanterns, run.trace, indexOf('augment') + 1);
    // R=h, g=c, d=b, a=t: the chain R–h=g–c=d–b=a–t, flipped.
    expect(lit.mate).toEqual([6, 7, 4, 5, 2, 3, 0, 1]);
    expect(lit.mate).toEqual(run.matching.mate);
  });

  it('refuses a moment outside the day', () => {
    expect(() => stateAt(lanterns, run.trace, -1)).toThrow();
    expect(() => stateAt(lanterns, run.trace, run.trace.length + 1)).toThrow();
  });

  it('property: at dusk the replay is exactly the result, lanterns and final forest alike', () => {
    fc.assert(
      fc.property(
        graphWithDensityArb({ maxN: 10 }).chain((graph) =>
          fc.tuple(fc.constant(graph), matchingArb(graph)),
        ),
        ([graph, initial]) => {
          const result = edmonds(graph, initial);
          expect(stateAt(initial, result.trace, 0).mate).toEqual(initial.mate);
          const dusk = stateAt(initial, result.trace, result.trace.length);
          expect(dusk.mate).toEqual(result.matching.mate);
          // Each sprout carries the mark of the folded node holding it in the final forest.
          result.finalLayer.nodes.forEach((node, id) => {
            for (const v of members(node)) {
              expect(dusk.label[v]).toBe(result.finalForest.label[id]);
            }
          });
        },
      ),
    );
  });

  it('an empty garden replays to an empty garden', () => {
    const empty = unwrap(createGraph(0, []));
    const result = edmonds(empty);
    expect(stateAt(emptyMatching(empty), result.trace, result.trace.length)).toEqual({
      mate: [],
      label: [],
      flowers: [],
    });
  });

  it("replays the player's own moves too: lighting, putting out, wiping the marks", () => {
    const path = unwrap(
      createGraph(3, [
        [0, 1],
        [1, 2],
      ]),
    );
    const dark = emptyMatching(path);
    const moves = [
      { type: 'light', u: 0, v: 1 },
      { type: 'labelOuter', vertex: 2, parent: null, root: 2 },
      { type: 'putOut', u: 0, v: 1 },
      { type: 'searchCleared' },
      { type: 'light', u: 1, v: 2 },
    ] as const;
    expect(stateAt(dark, moves, 2)).toMatchObject({
      mate: [1, 0, -1],
      label: ['none', 'none', 'outer'],
    });
    expect(stateAt(dark, moves, 5)).toEqual({
      mate: [-1, 2, 1],
      label: ['none', 'none', 'none'],
      flowers: [],
    });
  });
});
