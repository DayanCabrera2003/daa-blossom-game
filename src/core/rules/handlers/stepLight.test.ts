import { describe, expect, it } from 'vitest';
import { createGraph } from '../../graph/createGraph';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import type { Action } from '../actions';
import { applyAction } from '../applyAction';
import { createGardenState, type GardenState } from '../state';

/** Applies actions in order, failing the test if any is refused. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

const STEP: Action = { type: 'stepLight' };

// Level 4.4: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5. The light owns the search:
// marks by hand are closed for the day.
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
const flowerLevel = (fog = false): GardenState =>
  createGardenState({
    graph: festivalGraph,
    matching: unwrap(
      createMatching(festivalGraph, [
        [1, 2],
        [3, 4],
      ]),
    ),
    allowed: ['stepLight', 'foldAt', 'inspect'],
    closed: ['markRoot', 'markMoon'],
    roots: [0],
    fog,
  });

describe('stepLight: the player advances the light one mark at a time', () => {
  it('makes the mark the light makes next, with the events of that mark', () => {
    const outcome = applyAction(flowerLevel(), STEP);
    expect(outcome).toMatchObject({
      ok: true,
      events: [{ type: 'labelOuter', vertex: 0, parent: null, root: 0 }],
    });
    // The same mark by hand is closed: the light owns the search.
    expect(applyAction(flowerLevel(), { type: 'markRoot', vertex: 0 })).toEqual({
      ok: false,
      reason: { code: 'actionClosed', action: 'markRoot' },
    });
  });

  it('stops where two suns of one tree meet, naming the vine, until the loop is folded', () => {
    const met = play(flowerLevel(), [STEP, STEP, STEP]);
    expect(applyAction(met, STEP)).toEqual({
      ok: false,
      reason: { code: 'lightAtFlower', u: 2, v: 4 },
    });
    const folded = play(met, [{ type: 'foldAt', from: 4, to: 2 }]);
    const found = play(folded, [STEP]);
    expect(found.chainSeen).toEqual([0, 1, 2, 4, 3, 5]);
    expect(applyAction(found, STEP)).toEqual({ ok: false, reason: { code: 'lightFound' } });
  });

  it('stops before a sun in the fog, telling which sprout to inspect', () => {
    const marked = play(flowerLevel(true), [STEP]);
    expect(applyAction(marked, STEP)).toEqual({
      ok: false,
      reason: { code: 'vineHidden', vertex: 0 },
    });
    expect(applyAction(play(marked, [{ type: 'inspect', vertex: 0 }]), STEP).ok).toBe(true);
  });

  it('says when the light has nothing left to look at', () => {
    // A single sprout in the dark with no vine: its sun has nowhere to look.
    const lonely = createGardenState({
      graph: unwrap(createGraph(1, [])),
      allowed: ['stepLight'],
    });
    expect(applyAction(play(lonely, [STEP]), STEP)).toEqual({
      ok: false,
      reason: { code: 'lightDone' },
    });
  });
});
