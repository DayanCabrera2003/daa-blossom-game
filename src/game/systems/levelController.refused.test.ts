import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { handle, startController, type Controller, type UiEvent } from './levelController';

/** A row A–B–C whose play step, won with one lantern, waits for a second one to be refused. */
const row = (): Level => {
  const loaded = loadLevel({
    id: '0.2',
    sprouts: [
      { label: 'A', x: 160, y: 135 },
      { label: 'B', x: 240, y: 135 },
      { label: 'C', x: 320, y: 135 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
    ],
    goal: { visible: true, value: 1 },
    victory: { type: 'matchingSize', value: 1 },
    flow: [
      { step: 'play', until: { refused: 'alreadyLit' } },
      { step: 'say', lines: ['ch0.2.sauce.00'] },
    ],
    solution: [{ type: 'join', u: 'A', v: 'B' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

/** Feeds events in order; returns the controller and every effect produced. */
const feed = (controller: Controller, events: readonly UiEvent[]) => {
  let current = controller;
  const effects = [];
  for (const event of events) {
    const step = handle(current, event, 0);
    current = step.controller;
    effects.push(...step.effects);
  }
  return { controller: current, effects };
};

/** A touch on the sprout of the row at `x`. */
const touch = (x: number): UiEvent[] => [
  { kind: 'press', point: { x, y: 135 } },
  { kind: 'release', point: { x, y: 135 } },
];

describe('a second lantern refused where the play step waits for it', () => {
  it('is told as a refusal, then whatever the script moves on to', () => {
    const lit = feed(startController(row(), 0), [...touch(160), ...touch(240)]);
    expect(lit.controller.session.won).toBeNull();
    // C, in the dark, then B, lit: a second lantern the rules refuse.
    const tried = feed(lit.controller, [...touch(320), ...touch(240)]);
    expect(tried.effects[0]).toMatchObject({ kind: 'rejected', reason: { code: 'alreadyLit' } });
    expect(tried.effects.map((effect) => effect.kind)).toEqual(['rejected', 'say', 'won']);
    expect(tried.controller.session.won).not.toBeNull();
  });
});
