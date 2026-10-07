import type { Action } from '@core/rules/actions';
import type { Level } from '@levels/build';
import { describe, expect, it } from 'vitest';
import { nestedFlowersLevel } from '../../../tests/support/fixtureLevels';
import type { Point } from '../input/target';
import { act, garden } from './levelSession';
import { handle, layerOf, startController, type Controller, type UiEvent } from './levelController';

// The garden of 5.1 (R a b c d g h t = 0…7) as if it were 5.2, where the layers open. Its
// solution folds F1 = {b, c, d} (flower 0) and then F2 = {R, a, F1, g, h} (flower 1) in six moves.
const base = nestedFlowersLevel();
const level: Level = { ...base, data: { ...base.data, id: '5.2' } };
const [b, c] = [2, 3];
/** A point inside F2 away from its petals and vines, and one inside F1 likewise. */
const inF2: Point = { x: 200, y: 135 };
const inF1: Point = { x: 277, y: 80 };

/** Feeds events in order; returns the controller and every effect produced. */
const feed = (controller: Controller, events: UiEvent[]) => {
  let current = controller;
  const effects = [];
  for (const event of events) {
    const step = handle(current, event, 0);
    current = step.controller;
    effects.push(...step.effects);
  }
  return { controller: current, effects };
};
const tap = (point: Point): UiEvent[] => [
  { kind: 'press', point },
  { kind: 'release', point },
];

/** The level with both flowers folded, the layers tool in hand, outside every flower. */
function foldedTwice(): Controller {
  let { session } = startController(level, 0);
  for (const action of level.solution.slice(0, 6) as Action[])
    session = act(session, action, 0).session;
  return feed({ ...startController(level, 0), session }, [{ kind: 'tool', tool: 'layers' }])
    .controller;
}

describe('the level controller with the layers (5.2)', () => {
  it('starts outside, and the layers tool enters F2, then F1 inside it', () => {
    const outside = foldedTwice();
    expect(outside.layers).toEqual([]);
    const inTwo = feed(outside, tap(inF2)).controller;
    expect(inTwo.layers).toEqual([1]);
    const inOne = feed(inTwo, tap(inF1));
    expect(inOne.controller.layers).toEqual([1, 0]);
    expect(inOne.effects).toEqual([]);
    // Entering changes the view only: the garden is the same.
    expect(garden(inOne.controller.session)).toBe(garden(outside.session));
  });

  it('from outside, a touch on the nested flower enters the one around it: outside in', () => {
    expect(feed(foldedTwice(), tap(inF1)).controller.layers).toEqual([1]);
  });

  it('leaving goes back to the layer before, then outside', () => {
    const deep = feed(foldedTwice(), [...tap(inF2), ...tap(inF1)]).controller;
    const once = feed(deep, [{ kind: 'leaveLayer' }]).controller;
    expect(once.layers).toEqual([1]);
    expect(feed(once, [{ kind: 'leaveLayer' }, { kind: 'leaveLayer' }]).controller.layers).toEqual(
      [],
    );
  });

  it('inside F1, a touch on an enlarged petal reaches the true sprout', () => {
    const deep = feed(foldedTwice(), [
      ...tap(inF2),
      ...tap(inF1),
      { kind: 'tool', tool: 'marks' },
    ]).controller;
    const view = layerOf(deep);
    const shownB = view.positions[b] as Point;
    expect(shownB).not.toEqual(level.data.sprouts[b]);
    // b is a sun (as part of F2): touching it with the marks selects it, the true sprout b.
    const touched = feed(deep, tap(shownB)).controller;
    expect(touched.pointer.selection).toEqual({ kind: 'sprout', vertex: b });
    // Touching c then looks at c from b, a move on the true garden that the rules answer.
    const looked = feed(touched, tap(view.positions[c] as Point));
    expect(looked.effects).toMatchObject([
      { kind: 'rejected', action: { type: 'markMoon', from: b, to: c } },
    ]);
  });

  it('unfolding still opens the flower on top only; the inner one is refused, as the rules do', () => {
    const inTwo = feed(foldedTwice(), [...tap(inF2), { kind: 'tool', tool: 'marks' }]).controller;
    const refused = feed(inTwo, tap(inF1));
    expect(refused.effects).toMatchObject([
      { kind: 'rejected', action: { type: 'unfold', blossom: 0 } },
    ]);
    expect(refused.controller.layers).toEqual([1]);
  });

  it('when the flower entered is gone, the view goes to the nearest layer that still exists', () => {
    const deep = feed(foldedTwice(), [...tap(inF2), ...tap(inF1)]).controller;
    // Undo takes back the fold of F2: F1 is on top again, and still entered.
    const undone = feed(deep, [{ kind: 'undo' }]).controller;
    expect(undone.layers).toEqual([0]);
    // Back before any fold, nothing is left to be inside of.
    expect(feed(undone, [{ kind: 'seek', fraction: 0 }]).controller.layers).toEqual([]);
  });

  it('a touch of the layers tool on anything but a flower shown does nothing', () => {
    const outside = foldedTwice();
    const touched = feed(outside, tap(level.data.sprouts[b] as Point));
    expect(touched.effects).toEqual([]);
    expect(touched.controller.layers).toEqual([]);
  });
});
