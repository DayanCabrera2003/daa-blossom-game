import { loadLevel } from '@levels/loader';
import type { Level } from '@levels/build';
import { describe, expect, it } from 'vitest';
import { handle, openController, type FreeOrders, type OrderAnswer } from './levelController';
import { garden, type LevelSession } from './levelSession';
import { applyAction } from '@core/rules/applyAction';

/** A pair of sprouts a–b in the dark, played with every action and the default script. */
const level = (): Level => {
  const loaded = loadLevel({
    id: '9.1',
    draft: true,
    sprouts: [
      { label: 'a', x: 100, y: 100 },
      { label: 'b', x: 200, y: 100 },
    ],
    vines: [['a', 'b']],
    goal: { visible: false },
    victory: { type: 'maximum' },
    solution: [{ type: 'join', u: 'a', v: 'b' }, { type: 'declareDone' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

/** An order that lights a–b as a day of its own and says so. */
const lightIt = (session: LevelSession): OrderAnswer => {
  const dawn = garden(session);
  const lit = applyAction(dawn, { type: 'join', u: 0, v: 1 });
  if (!lit.ok) throw new Error('the pair lights');
  return {
    kind: 'done',
    session: { ...session, history: { states: [dawn, lit.state], cursor: 1 } },
    day: [dawn, lit.state],
    within: 5000,
    lines: [{ key: 'sandbox.solve.done', params: { count: 1 }, speaker: 'sauce' }],
  };
};

const ORDERS: FreeOrders = {
  solve: lightIt,
  certify: () => ({ kind: 'refused', toast: { key: 'sandbox.certify.notYet', params: {} } }),
};

describe("the level controller and the free mode's orders", () => {
  it('a level of the catalog has none: the orders do nothing', () => {
    const { controller } = openController(level(), 0);
    expect(controller.orders).toBeNull();
    for (const kind of ['solve', 'certify'] as const) {
      const step = handle(controller, { kind }, 0);
      expect(step.effects).toEqual([]);
      expect(step.controller.session).toBe(controller.session);
    }
  });

  it('an order done takes its session, and shows its day and then its words', () => {
    const { controller } = openController(level(), 0, ORDERS);
    const step = handle(controller, { kind: 'solve' }, 0);
    expect(step.controller.session.history.cursor).toBe(1);
    expect(step.effects).toEqual([
      {
        kind: 'ordered',
        day: step.controller.session.history.states,
        within: 5000,
        lines: [{ key: 'sandbox.solve.done', params: { count: 1 }, speaker: 'sauce' }],
      },
    ]);
  });

  it('an order refused keeps the garden and says why', () => {
    const { controller } = openController(level(), 0, ORDERS);
    const step = handle(controller, { kind: 'certify' }, 0);
    expect(step.controller.session).toBe(controller.session);
    expect(step.effects).toEqual([
      { kind: 'orderRefused', text: { key: 'sandbox.certify.notYet', params: {} } },
    ]);
  });

  it('an order the player has not met, or one the script holds back, does nothing', () => {
    const { controller } = openController(level(), 0, { solve: null, certify: () => null });
    expect(handle(controller, { kind: 'solve' }, 0).effects).toEqual([]);
    expect(handle(controller, { kind: 'certify' }, 0).effects).toEqual([]);
  });
});
