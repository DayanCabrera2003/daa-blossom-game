import { describe, expect, it } from 'vitest';
import { contract, openLayer } from '../../blossom/contract';
import { createGraph } from '../../graph/createGraph';
import { createMatching } from '../../matching/createMatching';
import { checkAugmentingPath } from '../../matching/paths';
import { unwrap } from '../../shared/result';
import type { Action } from '../actions';
import { applyAction } from '../applyAction';
import { createGardenState, type GardenState } from '../state';
import { chain } from './chain';

// Level 1.4: A free. Branch 1: A–B=C–D=E (a dead end). Branch 2: A–F=G–H, H free.
// A B C D E F G H = 0 1 2 3 4 5 6 7.
const alley = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [5, 6],
    [6, 7],
  ]),
);
const state = createGardenState({
  graph: alley,
  matching: unwrap(
    createMatching(alley, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
  ),
  allowed: ['chain'],
});

describe('chain: pass the lanterns along a path', () => {
  it('ending in the dark lights one more lantern (branch 2)', () => {
    const outcome = chain(state, { type: 'chain', path: [0, 5, 6, 7] });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([5, 2, 1, 4, 3, 0, 7, 6]);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'augment', path: [0, 5, 6, 7] }]);
  });

  it('ending on a lantern is allowed with gain 0: the darkness only moves (branch 1)', () => {
    const outcome = chain(state, { type: 'chain', path: [0, 1, 2, 3, 4] });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([1, 0, 3, 2, -1, 6, 5, -1]);
  });

  it('two dark vines in a row are refused: B already has a lantern', () => {
    expect(chain(state, { type: 'chain', path: [0, 1, 0] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'repeatedVertex' } },
    });
    expect(chain(state, { type: 'chain', path: [5, 0, 1] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath' },
    });
  });

  it('a chain has to start in the dark', () => {
    expect(chain(state, { type: 'chain', path: [1, 2, 3, 4] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'endpointNotExposed', vertex: 1 } },
    });
  });

  it('a chain stopping right after a dark vine on a lit sprout is refused', () => {
    expect(chain(state, { type: 'chain', path: [0, 1, 2, 3] })).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'wrongParity' } },
    });
  });

  it('lanterns never slide through a closed flower: it has to be opened first', () => {
    const triangle = unwrap(
      createGraph(3, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
    );
    const open = createGardenState({
      graph: triangle,
      matching: unwrap(createMatching(triangle, [[1, 2]])),
      allowed: ['chain'],
    });
    const folded = { ...open, layer: contract(open.layer, [0, 1, 2]).layer };
    expect(chain(folded, { type: 'chain', path: [0, 1, 2] })).toEqual({
      ok: false,
      reason: { code: 'flowersFolded' },
    });
  });
});

/** Plays moves in order; a refusal here is a test bug. */
const play = (from: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, from);

// Level 4.8, two branches from R: R–a=b with the dead-end triangle b–c=d–b, and R–f=g–h, h free.
// R a b c d f g h = 0 1 2 3 4 5 6 7.
const twoBranches = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [0, 5],
    [5, 6],
    [6, 7],
  ]),
);
const branchesStart = createGardenState({
  graph: twoBranches,
  matching: unwrap(
    createMatching(twoBranches, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]),
  ),
  allowed: ['markRoot', 'markMoon', 'foldAt', 'chain'],
});
/** The search: the triangle folds into a flower, then the other branch reaches h. */
const searched = play(branchesStart, [
  { type: 'markRoot', vertex: 0 },
  { type: 'markMoon', from: 0, to: 1 },
  { type: 'markMoon', from: 2, to: 3 },
  { type: 'foldAt', from: 4, to: 2 },
  { type: 'markMoon', from: 0, to: 5 },
  { type: 'markMoon', from: 6, to: 7 },
]);

describe('chain: with flowers folded off its path (level 4.8)', () => {
  it('a chain that does not go through any flower is applied and the garden opens whole', () => {
    expect(searched.layer.nodes.length).toBe(6);
    expect(searched.chainSeen).toEqual([0, 5, 6, 7]);
    expect(checkAugmentingPath(twoBranches, searched.matching, [0, 5, 6, 7]).ok).toBe(true);
    const outcome = chain(searched, { type: 'chain', path: [0, 5, 6, 7] });
    if (!outcome.ok) throw new Error(`refused: ${outcome.reason.code}`);
    const { state } = outcome;
    expect(state.matching.mate).toEqual([5, 2, 1, 4, 3, 0, 7, 6]);
    // As at the end of a round: no flower, no marks, the chain seen is spent.
    expect(state.layer).toEqual(openLayer(twoBranches, state.matching));
    expect(state.search).toBeNull();
    expect(state.chainSeen).toBeNull();
    expect(outcome.events).toEqual([
      { type: 'augment', path: [0, 5, 6, 7] },
      { type: 'searchCleared' },
    ]);
  });

  it('a chain through the folded flower still needs it opened first', () => {
    expect(chain(searched, { type: 'chain', path: [0, 1, 2] })).toEqual({
      ok: false,
      reason: { code: 'flowersFolded' },
    });
  });
});
