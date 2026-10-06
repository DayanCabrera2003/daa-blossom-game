import { describe, expect, it } from 'vitest';
import { pathGraph } from '../../generators/families';
import { createGraph } from '../../graph/createGraph';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import type { Action } from '../actions';
import { createGardenState, type GardenState } from '../state';
import { markMoon } from './markMoon';
import { markRoot } from './markRoot';

type MarkAction = Extract<Action, { type: 'markRoot' | 'markMoon' }>;

/** Applies marking actions in order, failing the test if any is refused. */
const play = (state: GardenState, actions: MarkAction[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome =
      action.type === 'markRoot' ? markRoot(current, action) : markMoon(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const fogPath = pathGraph(6);
const fog = createGardenState({
  graph: fogPath,
  matching: unwrap(
    createMatching(fogPath, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: ['markRoot', 'markMoon'],
});

// Level 4.1: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5.
const festivalGraph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const festival = createGardenState({
  graph: festivalGraph,
  matching: unwrap(
    createMatching(festivalGraph, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: ['markRoot', 'markMoon'],
});

describe('marking suns and moons', () => {
  it('a search starts with a sun on a sprout in the dark', () => {
    const outcome = markRoot(fog, { type: 'markRoot', vertex: 0 });
    expect(outcome.ok && outcome.state.search?.label[0]).toBe('outer');
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'labelOuter', vertex: 0, parent: null, root: 0 },
    ]);
  });

  it('only a sprout in the dark can start a search', () => {
    expect(markRoot(fog, { type: 'markRoot', vertex: 1 })).toEqual({
      ok: false,
      reason: { code: 'notInTheDark', vertex: 1 },
    });
  });

  it('from a sun along a dark vine: a moon, and its partner a sun', () => {
    const rooted = play(fog, [{ type: 'markRoot', vertex: 0 }]);
    const outcome = markMoon(rooted, { type: 'markMoon', from: 0, to: 1 });
    expect(outcome.ok && outcome.state.search?.label).toEqual([
      'outer',
      'inner',
      'outer',
      'none',
      'none',
      'none',
    ]);
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'labelInner', vertex: 1, parent: 0, root: 0 },
      { type: 'labelOuter', vertex: 2, parent: 1, root: 0 },
    ]);
  });

  it('a lonely moon at the end of the walk is a chain (level 3.1)', () => {
    const walked = play(fog, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
    ]);
    const outcome = markMoon(walked, { type: 'markMoon', from: 4, to: 5 });
    expect(outcome.ok && outcome.state.chainSeen).toEqual([0, 1, 2, 3, 4, 5]);
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'chainFound', path: [0, 1, 2, 3, 4, 5] },
    ]);
  });

  it('two lights touching from different trees is a chain too (level 3.4)', () => {
    const twoTrees = play(fog, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markRoot', vertex: 5 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 5, to: 4 },
    ]);
    const outcome = markMoon(twoTrees, { type: 'markMoon', from: 2, to: 3 });
    expect(outcome.ok && outcome.state.chainSeen).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("looking back along a sun's own lantern leads nowhere", () => {
    const walked = play(fog, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
    ]);
    expect(markMoon(walked, { type: 'markMoon', from: 2, to: 1 })).toEqual({
      ok: false,
      reason: { code: 'litVine', u: 2, v: 1 },
    });
  });

  it('the betrayal of level 4.1: from d, b is a sun of the same tree, and c–e is never seen', () => {
    const searched = play(festival, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
    ]);
    expect(markMoon(searched, { type: 'markMoon', from: 4, to: 2 })).toEqual({
      ok: false,
      reason: { code: 'sunMeetsSun', u: 4, v: 2 },
    });
    // c is a moon: it does not look along its vines, so the exit to e stays unexplored.
    expect(markMoon(searched, { type: 'markMoon', from: 3, to: 5 })).toEqual({
      ok: false,
      reason: { code: 'notASun', vertex: 3 },
    });
  });

  it('looking from a sprout that is not a sun, or along a vine that is not there, is refused', () => {
    const rooted = play(fog, [{ type: 'markRoot', vertex: 0 }]);
    expect(markMoon(fog, { type: 'markMoon', from: 0, to: 1 })).toMatchObject({
      reason: { code: 'notASun', vertex: 0 },
    });
    expect(markMoon(rooted, { type: 'markMoon', from: 0, to: 2 })).toMatchObject({
      reason: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });

  it('a moon already marked from elsewhere is left as it is (level 3.3)', () => {
    // Two sprouts in the dark, 0 and 3, both next to the lit sprout 1 (1=2): suns on both sides.
    const square = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [1, 3],
      ]),
    );
    const state = createGardenState({
      graph: square,
      matching: unwrap(createMatching(square, [[1, 2]])),
      allowed: ['markRoot', 'markMoon'],
    });
    const marked = play(state, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markRoot', vertex: 3 },
      { type: 'markMoon', from: 0, to: 1 },
    ]);
    expect(markMoon(marked, { type: 'markMoon', from: 3, to: 1 })).toEqual({
      ok: false,
      reason: { code: 'alreadyMarked', vertex: 1 },
    });
  });

  it('in the fog, only the vines of inspected sprouts can be followed', () => {
    const foggy = {
      ...play(fog, [{ type: 'markRoot', vertex: 0 }]),
      revealed: new Array(6).fill(false),
    };
    expect(markMoon(foggy, { type: 'markMoon', from: 0, to: 1 })).toEqual({
      ok: false,
      reason: { code: 'vineHidden', vertex: 0 },
    });
  });
});
