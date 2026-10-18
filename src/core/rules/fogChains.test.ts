import { describe, expect, it } from 'vitest';
import { pathGraph } from '../generators/families';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import type { Action } from './actions';
import { applyAction } from './applyAction';
import { requireVisibleVines } from './checks';
import { createGardenState, type GardenState } from './state';

// In the fog (chapter 3) a chain only goes along vines the player can see, those with an inspected
// end: the drag never feels out the garden the fog hides. R–a=b–c=d–T as 0–1=2–3=4–5.
const path = pathGraph(6);
const fog = createGardenState({
  graph: path,
  matching: unwrap(
    createMatching(path, [
      [1, 2],
      [3, 4],
    ]),
  ),
  fog: true,
  allowed: ['join', 'split', 'passLantern', 'chain', 'rotateStem', 'inspect'],
});

/** The fog lifted around the given sprouts. */
const inspected = (state: GardenState, vertices: readonly number[]): GardenState =>
  vertices.reduce((current, vertex) => {
    const outcome = applyAction(current, { type: 'inspect', vertex });
    if (!outcome.ok) throw new Error(`inspect refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

describe('chains in the fog', () => {
  it('a vine is visible once one of its ends is inspected', () => {
    const state = inspected(fog, [0, 2, 4]);
    expect(requireVisibleVines(state, [0, 1, 2, 3, 4, 5])).toBeNull();
    expect(requireVisibleVines(inspected(fog, [0, 2]), [0, 1, 2, 3, 4, 5])).toEqual({
      code: 'vineHidden',
      vertex: 3,
    });
    expect(requireVisibleVines({ ...fog, revealed: null }, [0, 1, 2])).toBeNull();
  });

  it.each([
    ['a chain', { type: 'chain', path: [0, 1, 2, 3, 4, 5] }, 0],
    ['a chain of gain 0', { type: 'chain', path: [0, 1, 2] }, 0],
    ['passing the lantern', { type: 'passLantern', from: 0, to: 1 }, 0],
    ['rotating the stem', { type: 'rotateStem', stem: [0, 1, 2] }, 0],
  ] as [string, Action, number][])('refuses %s along a hidden vine', (_, action, vertex) => {
    expect(applyAction(fog, action)).toEqual({ ok: false, reason: { code: 'vineHidden', vertex } });
  });

  it('refuses a join along a hidden vine, and accepts it once the fog lifts', () => {
    const dark = { ...fog, matching: unwrap(createMatching(path, [])) };
    expect(applyAction(dark, { type: 'join', u: 1, v: 2 })).toEqual({
      ok: false,
      reason: { code: 'vineHidden', vertex: 1 },
    });
    expect(applyAction(inspected(dark, [2]), { type: 'join', u: 1, v: 2 }).ok).toBe(true);
  });

  it('accepts the chain once every vine of it is in sight', () => {
    const outcome = applyAction(inspected(fog, [1, 3, 5]), {
      type: 'chain',
      path: [0, 1, 2, 3, 4, 5],
    });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([1, 0, 3, 2, 5, 4]);
  });
});
