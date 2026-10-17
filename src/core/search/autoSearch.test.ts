import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import type { Action } from '../rules/actions';
import { applyAction } from '../rules/applyAction';
import { createGardenState, type GardenState } from '../rules/state';
import { unwrap } from '../shared/result';
import { autoSearch } from './autoSearch';
import { searchStatus } from './searchStatus';

/** Plays moves in order; a refusal fails the test with its reason. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

/** The light's search of a garden, under the garden's own roots. */
const lightOf = (state: GardenState): Action[] =>
  autoSearch(state.layer, state.search, state.roots);

/** Where the search stands, without folding. */
const statusOf = (state: GardenState) =>
  searchStatus(state.layer, state.search, { roots: state.roots, foldAllowed: false });

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
  roots: [0],
});

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const path = pathGraph(6);
const walk = createGardenState({
  graph: path,
  matching: unwrap(
    createMatching(path, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: ['markRoot', 'markMoon'],
});

describe('autoSearch: the light searching by itself with the player rules', () => {
  it('on the garden of 4.1 it marks R, a and b, c and d, and stops without a chain', () => {
    const actions = lightOf(festival);
    expect(actions).toEqual([
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
    ]);
    const searched = play(festival, actions);
    expect(statusOf(searched)).toBe('exhausted');
    expect(searched.chainSeen).toBeNull();
  });

  it('stops at the look that finds a chain, which the rules accept and show', () => {
    const actions = lightOf(walk);
    expect(actions).toEqual([
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'markMoon', from: 4, to: 5 },
    ]);
    expect(play(walk, actions).chainSeen).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('without named roots it starts from every sprout in the dark, in ascending order', () => {
    // A lonely sprout with no vines is searched first, and in vain; then 1, whose look finds 2.
    const graph = unwrap(createGraph(3, [[1, 2]]));
    const start = createGardenState({ graph, allowed: ['markRoot', 'markMoon'] });
    const actions = lightOf(start);
    expect(actions).toEqual([
      { type: 'markRoot', vertex: 0 },
      { type: 'markRoot', vertex: 1 },
      { type: 'markMoon', from: 1, to: 2 },
    ]);
    expect(statusOf(play(start, actions))).toBe('chain');
  });

  it('carries on a search already begun, from the suns it has', () => {
    const begun = play(walk, [{ type: 'markRoot', vertex: 0 }]);
    expect(lightOf(begun)).toEqual([
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'markMoon', from: 4, to: 5 },
    ]);
  });

  it('does nothing in a garden with nobody in the dark', () => {
    const lit = createGardenState({
      graph: pathGraph(2),
      matching: unwrap(createMatching(pathGraph(2), [[0, 1]])),
      allowed: ['markRoot', 'markMoon'],
    });
    expect(lightOf(lit)).toEqual([]);
  });

  it('on any garden, without folding, every look is accepted and it ends in a chain or exhausted', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
        const start = createGardenState({ graph, matching, allowed: ['markRoot', 'markMoon'] });
        const searched = play(start, lightOf(start));
        const status = statusOf(searched);
        expect(status).toBe(searched.chainSeen === null ? 'exhausted' : 'chain');
      }),
    );
  });
});
