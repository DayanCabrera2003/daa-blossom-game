import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { openLayer } from '../blossom/contract';
import { checkBlossom } from '../blossom/isBlossom';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import type { Action } from '../rules/actions';
import { applyAction } from '../rules/applyAction';
import { createGardenState, type GardenState } from '../rules/state';
import { unwrap } from '../shared/result';
import { bipartiteSearch } from './bipartiteSearch';
import { findConflict, isConflictVine } from './conflict';

/** Plays moves in order; a refusal here is a test bug. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

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
  allowed: ['markRoot', 'markMoon', 'foldAt'],
});
/** The player's search of level 4.1 from R alone: R sun, a moon, b sun, c moon, d sun. */
const betrayed = play(festival, [
  { type: 'markRoot', vertex: 0 },
  { type: 'markMoon', from: 0, to: 1 },
  { type: 'markMoon', from: 2, to: 3 },
]);

describe('findConflict: the vine where the light went wrong, and the loop it closes', () => {
  it('in level 4.1, searched from R alone, the conflict is d–b and its loop has 3 sprouts', () => {
    expect(findConflict(betrayed.layer, betrayed.search)).toEqual({
      vine: [2, 4],
      loop: [2, 4, 3],
      sprouts: 3,
    });
  });

  it('there is no conflict before any mark, nor while the search has not met itself', () => {
    expect(findConflict(festival.layer, festival.search)).toBeNull();
    const early = play(festival, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
    ]);
    expect(findConflict(early.layer, early.search)).toBeNull();
  });

  it('a folded loop leaves no conflict behind: its vines are inside the flower', () => {
    const folded = play(betrayed, [{ type: 'foldAt', from: 4, to: 2 }]);
    expect(findConflict(folded.layer, folded.search)).toBeNull();
  });

  it('only the vine between two suns of one tree is the conflict', () => {
    const { layer, search } = betrayed;
    expect(isConflictVine(layer, search, 2, 4)).toBe(true);
    expect(isConflictVine(layer, search, 4, 2)).toBe(true);
    // b–c reaches a moon, c=d is lit, c–e leads to an unmarked sprout, R–a to a moon.
    expect(isConflictVine(layer, search, 2, 3)).toBe(false);
    expect(isConflictVine(layer, search, 3, 4)).toBe(false);
    expect(isConflictVine(layer, search, 3, 5)).toBe(false);
    expect(isConflictVine(layer, search, 0, 1)).toBe(false);
    expect(isConflictVine(festival.layer, festival.search, 2, 4)).toBe(false);
  });

  it('two suns of different trees touching are a chain, not a conflict (level 3.4)', () => {
    // R–a=b–c=d–T as 0–1=2–3=4–5, searched from both ends: b and d meet as suns of two trees.
    const path = unwrap(
      createGraph(6, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
      ]),
    );
    const twoTrees = play(
      createGardenState({
        graph: path,
        matching: unwrap(
          createMatching(path, [
            [1, 2],
            [3, 4],
          ]),
        ),
        allowed: ['markRoot', 'markMoon'],
      }),
      [
        { type: 'markRoot', vertex: 0 },
        { type: 'markRoot', vertex: 5 },
        { type: 'markMoon', from: 0, to: 1 },
        { type: 'markMoon', from: 5, to: 4 },
      ],
    );
    expect(findConflict(twoTrees.layer, twoTrees.search)).toBeNull();
    expect(isConflictVine(twoTrees.layer, twoTrees.search, 2, 3)).toBe(false);
  });

  it('property: where a search meets itself, the conflict closes a valid flower', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const result = bipartiteSearch(graph, matching);
        if (result.ok) return;
        const layer = openLayer(graph, matching);
        const conflict = findConflict(layer, result.error.forest);
        expect(conflict).not.toBeNull();
        if (conflict === null) return;
        const [u, v] = conflict.vine;
        expect(isConflictVine(layer, result.error.forest, u, v)).toBe(true);
        expect(checkBlossom(graph, matching, conflict.loop)).toEqual({
          ok: true,
          value: conflict.loop,
        });
        expect(conflict.sprouts).toBe(conflict.loop.length);
      }),
    );
  });
});
