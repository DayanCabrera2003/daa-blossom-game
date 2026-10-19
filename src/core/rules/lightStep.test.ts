import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { autoSearch } from '../search/autoSearch';
import { unwrap } from '../shared/result';
import type { Action } from './actions';
import { applyAction } from './applyAction';
import { lightStep } from './lightStep';
import { createGardenState, type GardenState } from './state';

/** Plays moves in order; a refusal fails the test with its reason. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

/** The light's next mark, played: fails the test if the light has none. */
const stepped = (state: GardenState): GardenState => {
  const step = lightStep(state);
  if (step.kind !== 'move') throw new Error(`the light stopped: ${step.kind}`);
  return play(state, [step.move]);
};

// Level 4.1, the garden of the flower levels: R–a=b, triangle b–c=d–b, c–e.
// R a b c d e = 0 1 2 3 4 5.
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
const festival = (fog = false): GardenState =>
  createGardenState({
    graph: festivalGraph,
    matching: unwrap(
      createMatching(festivalGraph, [
        [1, 2],
        [3, 4],
      ]),
    ),
    allowed: ['markRoot', 'markMoon', 'foldAt', 'inspect'],
    roots: [0],
    fog,
  });

describe('lightStep: the light that searches by itself and stops at a flower', () => {
  it('marks as the light of 4.1 does, one mark at a time, until two suns of one tree meet', () => {
    const start = festival();
    expect(lightStep(start)).toEqual({ kind: 'move', move: { type: 'markRoot', vertex: 0 } });
    const r = stepped(start);
    expect(lightStep(r)).toEqual({ kind: 'move', move: { type: 'markMoon', from: 0, to: 1 } });
    const b = stepped(r);
    expect(lightStep(b)).toEqual({ kind: 'move', move: { type: 'markMoon', from: 2, to: 3 } });
    // b and d are now suns of R's tree: the light stops on the vine where they meet.
    expect(lightStep(stepped(b))).toEqual({ kind: 'flower', from: 2, to: 4 });
  });

  it('goes on from the flower once it is folded, and stops when it has seen the chain', () => {
    const met = play(festival(), [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'foldAt', from: 2, to: 4 },
    ]);
    expect(lightStep(met)).toEqual({ kind: 'move', move: { type: 'markMoon', from: 3, to: 5 } });
    const found = stepped(met);
    expect(found.chainSeen).toEqual([0, 1, 2, 4, 3, 5]);
    expect(lightStep(found)).toEqual({ kind: 'found' });
  });

  it('has nothing left to look at once the search is over without a chain', () => {
    // 4.9: R–a=b and the triangle b–c=d–b, no way out: after the fold, nothing is left.
    const graph = unwrap(
      createGraph(5, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
      ]),
    );
    let state = createGardenState({
      graph,
      matching: unwrap(
        createMatching(graph, [
          [1, 2],
          [3, 4],
        ]),
      ),
      allowed: ['markRoot', 'markMoon', 'foldAt'],
      roots: [0],
    });
    for (let step = lightStep(state); step.kind !== 'done'; step = lightStep(state)) {
      if (step.kind === 'flower') state = play(state, [{ type: 'foldAt', ...step }]);
      else if (step.kind === 'move') state = play(state, [step.move]);
      else throw new Error(`unexpected ${step.kind}`);
    }
    expect(state.layer.nodes.some((node) => node.kind === 'blossom')).toBe(true);
    expect(state.chainSeen).toBeNull();
  });

  it('stops before a sun whose vines the fog still hides, and goes on once it is inspected', () => {
    const start = festival(true);
    // A root needs no look, so the first sun is marked in the fog.
    const r = stepped(start);
    expect(lightStep(r)).toEqual({ kind: 'fog', vertex: 0 });
    const seen = play(r, [{ type: 'inspect', vertex: 0 }]);
    expect(lightStep(seen)).toEqual({ kind: 'move', move: { type: 'markMoon', from: 0, to: 1 } });
  });

  it('starts from every sprout in the dark, in order, when the level names no roots', () => {
    const graph = unwrap(createGraph(3, [[1, 2]]));
    const state = createGardenState({ graph, allowed: ['markRoot', 'markMoon'] });
    expect(lightStep(state)).toEqual({ kind: 'move', move: { type: 'markRoot', vertex: 0 } });
    // Sprout 0 has no vine: its tree is over at once, and the light goes on to sprout 1.
    expect(lightStep(stepped(state))).toEqual({
      kind: 'move',
      move: { type: 'markRoot', vertex: 1 },
    });
  });

  it('is accepted by the rules at every mark, and its first mark is the one of autoSearch', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 8 }), ([graph, matching]) => {
        let state = createGardenState({
          graph,
          matching,
          allowed: ['markRoot', 'markMoon', 'foldAt'],
        });
        const first = lightStep(state);
        const auto = autoSearch(state.layer, null, null);
        if (first.kind === 'move') expect(first.move).toEqual(auto[0]);
        for (let guard = 0; guard < 200; guard++) {
          const step = lightStep(state);
          if (step.kind === 'move') state = play(state, [step.move]);
          else if (step.kind === 'flower') state = play(state, [{ type: 'foldAt', ...step }]);
          else break;
        }
        const end = lightStep(state);
        expect(['found', 'done']).toContain(end.kind);
        if (end.kind === 'found' && state.chainSeen !== null) {
          expect(checkAugmentingPath(graph, matching, state.chainSeen).ok).toBe(true);
        }
      }),
    );
  });
});
