import type { Point } from '../input/target';
import { describe, expect, it } from 'vitest';
import { bloomLevel } from '../../../tests/support/fixtureLevels';
import { HINT_DELAY_MS } from './hints';
import { garden } from './levelSession';
import { handle, startController, type Controller, type UiEvent } from './levelController';

// The bloom garden: b c d f g e t h x = 0…8; the script opens on the flower challenge.
const level = bloomLevel();
const spot = (v: number): Point => {
  const sprout = level.data.sprouts[v];
  if (sprout === undefined) throw new Error(`no sprout ${v}`);
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
const drag = (path: number[]): UiEvent[] => [
  { kind: 'press', point: spot(path[0] as number) },
  ...path.slice(1).map((v): UiEvent => ({ kind: 'move', point: spot(v) })),
  { kind: 'release', point: spot(path[path.length - 1] as number) },
];

describe('the level controller in the flower challenge (4.11)', () => {
  it('a chain dragged in the open garden is drawn and cut, never applied', () => {
    const opened = startController(level, 0);
    const { controller, effects } = feed(opened, drag([6, 8, 7, 2, 1, 5]));
    expect(effects).toMatchObject([
      { kind: 'flowerDrawn', attempt: { kind: 'cut', argument: { stretch: [6, 8, 7, 2] } } },
    ]);
    expect(garden(controller.session)).toBe(level.start);
    expect(controller.pointer.chain).toBeNull();
    expect(controller.session.flower.chains).toBe(1);
  });

  it('whatever tool is in hand, a drag from a sprout in the dark draws', () => {
    const marks = feed(startController(level, 0), [{ kind: 'tool', tool: 'marks' }]).controller;
    const { controller, effects } = feed(marks, drag([5, 6]));
    expect(effects.map((effect) => effect.kind)).toEqual(['flowerDrawn']);
    expect(controller.pointer.tool).toBe('marks');
  });

  it('a drag that ends on a lit sprout is no chain; a touch or a lit start draws nothing', () => {
    const { effects } = feed(startController(level, 0), drag([6, 8]));
    expect(effects).toMatchObject([{ kind: 'flowerDrawn', attempt: { kind: 'notAChain' } }]);
    const still = feed(startController(level, 0), [...drag([5]), ...drag([8, 7])]);
    expect(still.effects).toEqual([]);
  });

  it('a chain can be given whole, as the walkthrough of a card would', () => {
    const { effects } = handle(startController(level, 0), { kind: 'drawChain', path: [5, 6] }, 0);
    expect(effects).toMatchObject([{ kind: 'flowerDrawn', attempt: { kind: 'cut' } }]);
  });

  it('three chains finish the challenge and the script goes on', () => {
    const { effects } = feed(startController(level, 0), [
      ...drag([6, 8, 7, 2, 1, 5]),
      ...drag([5, 1, 2, 3, 4, 0]),
      ...drag([5, 6]),
    ]);
    expect(effects.map((effect) => effect.kind)).toEqual([
      'flowerDrawn',
      'flowerDrawn',
      'flowerDrawn',
      'say',
      'won',
    ]);
  });

  it('the third hint draws a chain for the player, which counts; drawing puts glows out', () => {
    let controller = startController(level, 0);
    const effects = [];
    for (let k = 1; k <= 3; k++) {
      const step = handle(controller, { kind: 'hint' }, k * HINT_DELAY_MS);
      controller = step.controller;
      effects.push(...step.effects.map((effect) => effect.kind));
    }
    expect(effects).toEqual(['hint', 'hint', 'hint', 'flowerDrawn']);
    expect(controller.session.flower.chains).toBe(1);
    expect(controller.highlight).toEqual([]);
  });
});
