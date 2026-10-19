import type { Action } from '@core/rules/actions';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import type { Point } from '../input/target';
import { act, garden } from './levelSession';
import { handle, startController, type Controller, type UiEvent } from './levelController';

// The gesture of lifting on the level screen (GDD §5.1, "El gesto de levantar"; plan 10, phase 2):
// 4.5 played to just before its chain is lit (the light has found it, the flower is open), with
// its script cut to the play step so the moves reach the garden at once.
const catalogued = catalog().find((candidate) => candidate.data.id === '4.5') as Level;
const level: Level = { ...catalogued, flow: [{ step: 'play', reactions: [] }] };
const id = (name: string): number =>
  level.data.sprouts.findIndex((sprout) => sprout.label === name);
const spot = (name: string): Point => {
  const sprout = level.data.sprouts[id(name)];
  if (sprout === undefined) throw new Error(`no sprout ${name}`);
  return { x: sprout.x, y: sprout.y };
};

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

/** A drag through these sprouts, as a finger would make it. */
const drag = (names: string): UiEvent[] => [
  { kind: 'press', point: spot(names[0] as string) },
  ...[...names.slice(1)].map((name): UiEvent => ({ kind: 'move', point: spot(name) })),
  { kind: 'release', point: spot(names[names.length - 1] as string) },
];

/** The level after the first `moves` moves of its reference solution. */
function after(moves: number): Controller {
  let { session } = startController(level, 0);
  for (const action of level.solution.slice(0, moves) as Action[])
    session = act(session, action, 0).session;
  return { ...startController(level, 0), session };
}

/** The flower open, the chain found: everything but lighting it. */
const ready = (): Controller => after(level.solution.length - 1);

describe('the gesture of lifting on the level screen (4.5)', () => {
  it('dragging only b–d=c lights the whole chain R a b d c e', () => {
    const { controller, effects } = feed(ready(), drag('bdc'));
    expect(effects.map((effect) => effect.kind)).toContain('animate');
    const lit = effects.find((effect) => effect.kind === 'animate');
    expect([
      ['R', 'a', 'b', 'd', 'c', 'e'].map(id),
      ['e', 'c', 'd', 'b', 'a', 'R'].map(id),
    ]).toContainEqual(lit?.kind === 'animate' && lit.action.type === 'chain' && lit.action.path);
    expect(garden(controller.session).chainSeen).toBeNull();
    expect(controller.pointer.chain).toBeNull();
  });

  it('from c, the wrong side c–b is refused at once, naming e, c and b', () => {
    const start = ready();
    const { controller, effects } = feed(start, drag('cb'));
    expect(effects[0]).toMatchObject({
      kind: 'rejected',
      reason: { code: 'invalidPath', error: { code: 'notAlternating' } },
      action: { type: 'chain', path: ['e', 'c', 'b'].map(id) },
    });
    // The drag only went as far as c, which fills nothing: the garden is as it was.
    expect(garden(controller.session)).toBe(garden(start.session));
  });

  it('b–c straight across composes a chain the rules refuse as not alternating', () => {
    const start = ready();
    const { controller, effects } = feed(start, drag('bc'));
    expect(effects).toMatchObject([
      { kind: 'rejected', reason: { code: 'invalidPath', error: { code: 'notAlternating' } } },
    ]);
    expect(garden(controller.session)).toBe(garden(start.session));
  });

  it('the whole chain dragged from R still works', () => {
    const { controller } = feed(ready(), drag('Rabdce'));
    expect(garden(controller.session).chainSeen).toBeNull();
    expect(controller.session.history.cursor).toBe(ready().session.history.cursor + 1);
  });

  it('with the flower still folded, a press on b starts nothing', () => {
    const folded = after(level.solution.length - 2);
    const { controller, effects } = feed(folded, drag('bdc'));
    expect(effects).toEqual([]);
    expect(garden(controller.session)).toBe(garden(folded.session));
  });

  it('a touch on b, the lit end of the gap, is still a touch', () => {
    const { controller, effects } = feed(ready(), [
      { kind: 'press', point: spot('b') },
      { kind: 'release', point: spot('b') },
    ]);
    expect(effects).toEqual([]);
    expect(controller.pointer.chain).toBeNull();
  });
});
