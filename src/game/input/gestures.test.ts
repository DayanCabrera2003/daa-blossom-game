import { contract } from '@core/blossom/contract';
import { createGraph } from '@core/graph/createGraph';
import { createMatching } from '@core/matching/createMatching';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { UNLOCKED_AT } from '@core/rules/permissions';
import { createGardenState, type GardenState } from '@core/rules/state';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { gesturesFor, perform } from './gestures';
import { initialPointer } from './pointer';
import type { Point } from './target';

// Level 4.1 as laid out in its file: R a b c d e = 0 1 2 3 4 5.
const positions: Point[] = [
  { x: 50, y: 135 },
  { x: 130, y: 135 },
  { x: 210, y: 135 },
  { x: 290, y: 85 },
  { x: 290, y: 185 },
  { x: 390, y: 85 },
];
const graph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const garden = createGardenState({
  graph,
  matching: unwrap(
    createMatching(graph, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: Object.keys(UNLOCKED_AT) as (keyof typeof UNLOCKED_AT)[],
});
const folded = { ...garden, layer: contract(garden.layer, [2, 3, 4]).layer };
const play = (state: GardenState, actions: Action[]) =>
  actions.reduce((s, a) => {
    const outcome = applyAction(s, a);
    if (!outcome.ok) throw new Error(outcome.reason.code);
    return outcome.state;
  }, state);

/** The actions the player produces by performing the gestures of `action`. */
const roundTrip = (state: GardenState, action: Action) =>
  perform(state, positions, initialPointer('lanterns'), gesturesFor(state, positions, action))
    .actions;

describe('gestures: every action can be performed on the canvas', () => {
  const searching = play(garden, [{ type: 'markRoot', vertex: 0 }]);
  const cases: [string, GardenState, Action][] = [
    ['join', garden, { type: 'join', u: 0, v: 5 }],
    ['split', garden, { type: 'split', u: 1, v: 2 }],
    ['pass the lantern', garden, { type: 'passLantern', from: 0, to: 1 }],
    ['chain', garden, { type: 'chain', path: [0, 1, 2, 4, 3, 5] }],
    ['rotate the stem', garden, { type: 'rotateStem', stem: [0, 1, 2] }],
    ['inspect', garden, { type: 'inspect', vertex: 3 }],
    ['sun', garden, { type: 'markRoot', vertex: 0 }],
    ['moon', searching, { type: 'markMoon', from: 0, to: 1 }],
    ['fold at the conflict', garden, { type: 'foldAt', from: 2, to: 4 }],
    ['fold a loop', garden, { type: 'fold', loop: [2, 3, 4] }],
    ['unfold', folded, { type: 'unfold', blossom: 0 }],
    ['scarecrow on', garden, { type: 'placeScarecrow', vertex: 2 }],
    ['scarecrow off', { ...garden, scarecrows: [2] }, { type: 'removeScarecrow', vertex: 2 }],
    ['stone up', garden, { type: 'liftStone', vertex: 2 }],
    ['stone down', { ...garden, stones: [2] }, { type: 'dropStone', vertex: 2 }],
    ['Terminé', garden, { type: 'declareDone' }],
  ];

  it.each(cases)('%s', (_, state, action) => {
    expect(roundTrip(state, action)).toEqual([action]);
  });

  it('says so when a vine cannot be touched because sprouts cover it', () => {
    const covered = unwrap(createGraph(9, [[0, 1]]));
    const crowded = createGardenState({ graph: covered, allowed: ['split'] });
    const spots = [0, 100, 20, 30, 40, 50, 60, 70, 80].map((x) => ({ x, y: 0 }));
    expect(() => gesturesFor(crowded, spots, { type: 'split', u: 0, v: 1 })).toThrow(
      /cannot be touched/,
    );
  });
});
