import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import type { VertexId } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath, checkStem } from '../matching/paths';
import { exposedVertices } from '../matching/queries';
import { unwrap } from '../shared/result';
import type { Action, ActionType } from './actions';
import { applyAction } from './applyAction';
import { judgeLighting, type ChainRule } from './chainRule';
import { createGardenState, type GardenState } from './state';

// Level 4.1, the garden of 4.5 and 4.10: R–a=b, triangle b–c=d–b, c–e.
// R a b c d e = 0 1 2 3 4 5. The flower b, c, d has its base at b.
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
const lanterns = unwrap(
  createMatching(festivalGraph, [
    [1, 2],
    [3, 4],
  ]),
);
const garden = (chains: ChainRule, allowed: readonly ActionType[]): GardenState =>
  createGardenState({ graph: festivalGraph, matching: lanterns, roots: [0], chains, allowed });

/** Applies actions in order, failing the test if any is refused. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

/** The search of 4.5 up to the chain seen through the folded flower, and the flower opened. */
const SEARCH: readonly Action[] = [
  { type: 'markRoot', vertex: 0 },
  { type: 'markMoon', from: 0, to: 1 },
  { type: 'markMoon', from: 2, to: 3 },
  { type: 'foldAt', from: 4, to: 2 },
  { type: 'markMoon', from: 3, to: 5 },
  { type: 'unfold', blossom: 0 },
];
const THE_CHAIN = [0, 1, 2, 4, 3, 5];

const SEEN_LEVEL: readonly ActionType[] = [
  'join',
  'chain',
  'markRoot',
  'markMoon',
  'foldAt',
  'unfold',
];
const seen = garden({ rule: 'seen' }, SEEN_LEVEL);

const FLOWER: ChainRule = { rule: 'fromBase', base: 2, petals: [2, 3, 4] };
const closedFlower = garden(FLOWER, ['join', 'split', 'passLantern', 'chain', 'rotateStem']);

describe('the chain rule of a level', () => {
  it('by default accepts any chain, as the rules always did', () => {
    const state = createGardenState({ graph: festivalGraph, matching: lanterns, allowed: [] });
    expect(state.chains).toEqual({ rule: 'any' });
    expect(judgeLighting(state, THE_CHAIN)).toBeNull();
    expect(judgeLighting(state, [0, 1, 2])).toBeNull();
  });

  it('property: with the default rule, no chain the player can drag is ever refused by it', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 8 }), ([graph, matching]) => {
        const state = createGardenState({ graph, matching, allowed: [] });
        for (const from of exposedVertices(matching)) {
          for (const to of graph.adjacency[from] ?? []) {
            const path: VertexId[] = [from, to];
            if (
              checkAugmentingPath(graph, matching, path).ok ||
              checkStem(graph, matching, path).ok
            )
              expect(judgeLighting(state, path)).toBeNull();
          }
        }
      }),
    );
  });

  describe('"seen": the lanterns only move where your light went (4.5)', () => {
    it('refuses the chain drawn by eye, before any search', () => {
      expect(applyAction(seen, { type: 'chain', path: THE_CHAIN })).toEqual({
        ok: false,
        reason: { code: 'chainNotSeen' },
      });
    });

    it('accepts the chain the marks reached, after folding and opening, in either direction', () => {
      const searched = play(seen, SEARCH);
      expect(searched.chainSeen).toEqual(THE_CHAIN);
      for (const path of [THE_CHAIN, [...THE_CHAIN].reverse()]) {
        const outcome = applyAction(searched, { type: 'chain', path });
        expect(outcome.ok && outcome.state.matching.mate).toEqual([1, 0, 4, 5, 2, 3]);
      }
    });

    it('refuses a chain of gain 0, which moves lanterns without the light', () => {
      const searched = play(seen, SEARCH);
      expect(judgeLighting(searched, [0, 1, 2])).toEqual({ code: 'chainNotSeen' });
      expect(applyAction(searched, { type: 'chain', path: [0, 1, 2] })).toEqual({
        ok: false,
        reason: { code: 'chainNotSeen' },
      });
    });

    it('refuses passing the lantern and rotating the stem even where the level forgot to close them', () => {
      const open = garden({ rule: 'seen' }, [...SEEN_LEVEL, 'passLantern', 'rotateStem']);
      expect(applyAction(open, { type: 'passLantern', from: 0, to: 1 })).toEqual({
        ok: false,
        reason: { code: 'chainNotSeen' },
      });
      expect(applyAction(open, { type: 'rotateStem', stem: [0, 1, 2] })).toEqual({
        ok: false,
        reason: { code: 'chainNotSeen' },
      });
    });

    it('judges a join as the chain of one vine it is', () => {
      // Two sprouts in the dark, 0–1: the search from 0 reaches 1 and sees the chain 0–1.
      const pair = unwrap(
        createGraph(3, [
          [0, 1],
          [1, 2],
        ]),
      );
      const dark = createGardenState({
        graph: pair,
        chains: { rule: 'seen' },
        allowed: SEEN_LEVEL,
      });
      expect(applyAction(dark, { type: 'join', u: 0, v: 1 })).toEqual({
        ok: false,
        reason: { code: 'chainNotSeen' },
      });
      const looked = play(dark, [
        { type: 'markRoot', vertex: 0 },
        { type: 'markMoon', from: 0, to: 1 },
      ]);
      expect(looked.chainSeen).toEqual([0, 1]);
      expect(applyAction(looked, { type: 'join', u: 1, v: 0 }).ok).toBe(true);
      expect(applyAction(looked, { type: 'join', u: 1, v: 2 })).toEqual({
        ok: false,
        reason: { code: 'chainNotSeen' },
      });
    });
  });

  describe('"fromBase": the flower is closed, chains only leave from its base (4.10)', () => {
    it('refuses the chain of 4.1, which goes round the flower without touching the base at an end', () => {
      expect(applyAction(closedFlower, { type: 'chain', path: THE_CHAIN })).toEqual({
        ok: false,
        reason: { code: 'flowerClosed' },
      });
    });

    it('refuses splitting and joining around the flower too', () => {
      const unlit = play(closedFlower, [
        { type: 'split', u: 1, v: 2 },
        { type: 'split', u: 3, v: 4 },
        { type: 'join', u: 0, v: 1 },
      ]);
      expect(applyAction(unlit, { type: 'join', u: 3, v: 5 })).toEqual({
        ok: false,
        reason: { code: 'flowerClosed' },
      });
    });

    it('refuses moving the darkness through a petal to a sprout that is not the base', () => {
      // e takes c's lantern: d, a petal that is not the base, would go dark.
      expect(applyAction(closedFlower, { type: 'passLantern', from: 5, to: 3 })).toEqual({
        ok: false,
        reason: { code: 'flowerClosed' },
      });
    });

    it('wins after rotating the stem, or passing the lantern from R to a, then b–d=c–e', () => {
      for (const rotate of [
        { type: 'rotateStem', stem: [0, 1, 2] },
        { type: 'passLantern', from: 0, to: 1 },
      ] as const) {
        const won = play(closedFlower, [rotate, { type: 'chain', path: [2, 4, 3, 5] }]);
        expect(won.matching.mate).toEqual([1, 0, 4, 5, 2, 3]);
      }
    });

    it('lets chains away from the flower alone', () => {
      expect(judgeLighting(closedFlower, [0, 1])).toBeNull();
    });
  });

  describe('closed for the day is not "not yet"', () => {
    it('an action the level closes is refused as closed; one not unlocked yet, as locked', () => {
      const state = createGardenState({
        graph: festivalGraph,
        matching: lanterns,
        allowed: ['chain'],
        closed: ['foldAt'],
      });
      expect(applyAction(state, { type: 'foldAt', from: 2, to: 4 })).toEqual({
        ok: false,
        reason: { code: 'actionClosed', action: 'foldAt' },
      });
      expect(applyAction(state, { type: 'markRoot', vertex: 0 })).toEqual({
        ok: false,
        reason: { code: 'actionLocked', action: 'markRoot' },
      });
    });
  });
});
