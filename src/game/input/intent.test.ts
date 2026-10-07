import { contract } from '@core/blossom/contract';
import { pathGraph } from '@core/generators/families';
import { createGraph } from '@core/graph/createGraph';
import { createMatching } from '@core/matching/createMatching';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { UNLOCKED_AT } from '@core/rules/permissions';
import { createGardenState, type GardenState } from '@core/rules/state';
import { unwrap } from '@core/shared/result';
import { describe, expect, it } from 'vitest';
import { resolveTap } from './intent';
import { NO_SELECTION, type Selection } from './selection';
import type { Target } from './target';
import type { ToolId } from './tools';

const EVERY = Object.keys(UNLOCKED_AT) as (keyof typeof UNLOCKED_AT)[];
const sprout = (vertex: number): Target => ({ kind: 'sprout', vertex });
const vine = (u: number, v: number): Target => ({ kind: 'vine', u, v });

/** Taps the targets in order with one tool; returns every action produced, in order. */
const tapAll = (state: GardenState, tool: ToolId, targets: Target[]): (Action | null)[] => {
  let selection: Selection = NO_SELECTION;
  return targets.map((target) => {
    const outcome = resolveTap(state, tool, selection, target);
    selection = outcome.selection;
    return outcome.action;
  });
};

// Level 1.1: A–B–C–D as 0–1–2–3, with the trap B=C lit.
const path = pathGraph(4);
const trap = createGardenState({
  graph: path,
  matching: unwrap(createMatching(path, [[1, 2]])),
  allowed: EVERY,
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
  allowed: EVERY,
});
const play = (state: GardenState, actions: Action[]) =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(outcome.reason.code);
    return outcome.state;
  }, state);

describe('lanterns tool', () => {
  it('two sprouts in the dark, one after the other, join (level 0.1)', () => {
    expect(tapAll(trap, 'lanterns', [sprout(0), sprout(3)])).toEqual([
      null,
      { type: 'join', u: 0, v: 3 },
    ]);
  });

  it('a sprout in the dark, then a lit neighbor, passes the lantern (level 1.1)', () => {
    expect(tapAll(trap, 'lanterns', [sprout(0), sprout(1)])).toEqual([
      null,
      { type: 'passLantern', from: 0, to: 1 },
    ]);
  });

  it('touching a lit vine puts its lantern out', () => {
    expect(tapAll(trap, 'lanterns', [vine(2, 1)])).toEqual([{ type: 'split', u: 2, v: 1 }]);
    expect(tapAll(trap, 'lanterns', [vine(0, 1)])).toEqual([null]);
  });

  it('starting on a lit sprout selects nothing; touching the selected sprout again lets go', () => {
    expect(resolveTap(trap, 'lanterns', NO_SELECTION, sprout(1))).toEqual({
      action: null,
      selection: NO_SELECTION,
    });
    expect(tapAll(trap, 'lanterns', [sprout(0), sprout(0), sprout(3)])).toEqual([null, null, null]);
  });

  it('touching empty ground or a flower lets go of the selection', () => {
    const selected: Selection = { kind: 'sprout', vertex: 0 };
    expect(resolveTap(trap, 'lanterns', selected, { kind: 'nothing' }).selection).toEqual(
      NO_SELECTION,
    );
    expect(resolveTap(trap, 'lanterns', selected, { kind: 'flower', blossom: 0 })).toEqual({
      action: null,
      selection: NO_SELECTION,
    });
  });
});

describe('marks tool', () => {
  it('a sprout in the dark gets a sun; a sun selected, then a neighbor, gets a moon (4.1)', () => {
    expect(tapAll(festival, 'marks', [sprout(0)])).toEqual([{ type: 'markRoot', vertex: 0 }]);
    const rooted = play(festival, [{ type: 'markRoot', vertex: 0 }]);
    expect(tapAll(rooted, 'marks', [sprout(0), sprout(1)])).toEqual([
      null,
      { type: 'markMoon', from: 0, to: 1 },
    ]);
  });

  it('from a sun, a lonely sprout is looked at too: that is how a chain shows up (3.1)', () => {
    const rooted = play(festival, [{ type: 'markRoot', vertex: 0 }]);
    expect(tapAll(rooted, 'marks', [sprout(0), sprout(5)])).toEqual([
      null,
      { type: 'markMoon', from: 0, to: 5 },
    ]);
  });

  it('touching the vine where two suns meet folds there; touching a flower opens it', () => {
    expect(tapAll(festival, 'marks', [vine(4, 2)])).toEqual([{ type: 'foldAt', from: 4, to: 2 }]);
    expect(tapAll(festival, 'marks', [{ kind: 'flower', blossom: 0 }])).toEqual([
      { type: 'unfold', blossom: 0 },
    ]);
  });

  it('a petal of a folded flower that shines as a sun can be looked from (4.4)', () => {
    const searched = play(festival, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'foldAt', from: 4, to: 2 },
    ]);
    expect(tapAll(searched, 'marks', [sprout(3), sprout(5)])).toEqual([
      null,
      { type: 'markMoon', from: 3, to: 5 },
    ]);
  });
});

describe('the other tools', () => {
  it('fold: touch the loop in order and close it on its first sprout', () => {
    expect(tapAll(festival, 'foldLoop', [sprout(2), sprout(3), sprout(4), sprout(2)])).toEqual([
      null,
      null,
      null,
      { type: 'fold', loop: [2, 3, 4] },
    ]);
    const folding: Selection = { kind: 'loop', vertices: [2, 3] };
    expect(resolveTap(festival, 'foldLoop', folding, { kind: 'nothing' }).selection).toEqual(
      NO_SELECTION,
    );
  });

  it('inspect, scarecrows and stones act on the sprout touched, and toggle', () => {
    expect(tapAll(trap, 'inspect', [sprout(2)])).toEqual([{ type: 'inspect', vertex: 2 }]);
    expect(tapAll(trap, 'scarecrows', [sprout(1)])).toEqual([
      { type: 'placeScarecrow', vertex: 1 },
    ]);
    expect(tapAll({ ...trap, scarecrows: [1] }, 'scarecrows', [sprout(1)])).toEqual([
      { type: 'removeScarecrow', vertex: 1 },
    ]);
    expect(tapAll(trap, 'stones', [sprout(1)])).toEqual([{ type: 'liftStone', vertex: 1 }]);
    expect(tapAll({ ...trap, stones: [1] }, 'stones', [sprout(1)])).toEqual([
      { type: 'dropStone', vertex: 1 },
    ]);
    expect(tapAll(trap, 'stones', [vine(0, 1), { kind: 'nothing' }])).toEqual([null, null]);
  });

  it('a folded flower opens when touched with the marks tool (4.5)', () => {
    const folded = { ...festival, layer: contract(festival.layer, [2, 3, 4]).layer };
    expect(tapAll(folded, 'marks', [{ kind: 'flower', blossom: 0 }])).toEqual([
      { type: 'unfold', blossom: 0 },
    ]);
  });

  it('touching empty ground with marks does nothing and lets go', () => {
    const selected: Selection = { kind: 'sprout', vertex: 0 };
    expect(resolveTap(festival, 'marks', selected, { kind: 'nothing' })).toEqual({
      action: null,
      selection: NO_SELECTION,
    });
  });

  it('touching the selected sun again, or taking back the only sprout of a loop, lets go', () => {
    const rooted = play(festival, [{ type: 'markRoot', vertex: 0 }]);
    expect(tapAll(rooted, 'marks', [sprout(0), sprout(0)])).toEqual([null, null]);
    expect(resolveTap(festival, 'foldLoop', { kind: 'loop', vertices: [2] }, sprout(2))).toEqual({
      action: null,
      selection: NO_SELECTION,
    });
  });

  it('tools that act on a sprout ignore touches elsewhere', () => {
    expect(tapAll(trap, 'inspect', [vine(0, 1)])).toEqual([null]);
    expect(tapAll(trap, 'scarecrows', [{ kind: 'nothing' }])).toEqual([null]);
  });

  it('the layers tool only looks: no touch makes a move (5.2)', () => {
    expect(tapAll(trap, 'layers', [sprout(0), sprout(1), vine(1, 2), { kind: 'nothing' }])).toEqual(
      [null, null, null, null],
    );
  });
});
