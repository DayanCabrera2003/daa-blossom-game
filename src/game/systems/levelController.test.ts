import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { gesturesFor } from '../input/gestures';
import type { Point } from '../input/target';
import { HINT_DELAY_MS } from './hints';
import { garden } from './levelSession';
import { startController, handle, type Controller, type UiEvent } from './levelController';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};
const placesOf = (level: Level) => level.data.sprouts.map(({ x, y }) => ({ x, y }));
/** Where sprout `v` of a level sits. */
const spot = (level: Level, v: number): Point => placesOf(level)[v] as Point;

/** Feeds events in order; returns the controller and every effect produced. */
const feed = (controller: Controller, events: UiEvent[], now = 0) => {
  let current = controller;
  const effects = [];
  for (const event of events) {
    const step = handle(current, event, now);
    current = step.controller;
    effects.push(...step.effects);
  }
  return { controller: current, effects };
};
const touch = (point: { x: number; y: number }): UiEvent[] => [
  { kind: 'press', point },
  { kind: 'release', point },
];

describe('the level controller', () => {
  const trap = levelById('1.1');
  const at = (v: number) => spot(trap, v);

  it('starts holding the first tool unlocked, with nothing glowing', () => {
    const controller = startController(trap, 0);
    expect(controller.pointer.tool).toBe('lanterns');
    expect(controller.highlight).toEqual([]);
  });

  it('two touches join two sprouts: the move is applied, and animated with its events', () => {
    const { controller, effects } = feed(startController(trap, 0), [
      ...touch(at(0)),
      ...touch(at(1)),
    ]);
    expect(garden(controller.session).matching.mate).toEqual([1, 0, -1, -1]);
    expect(effects).toEqual([
      {
        kind: 'animate',
        action: { type: 'join', u: 0, v: 1 },
        events: [{ type: 'light', u: 0, v: 1 }],
      },
    ]);
  });

  it('a refused move comes back with its reason and the move tried, and changes nothing', () => {
    const { controller, effects } = feed(startController(trap, 0), [
      ...touch(at(0)),
      ...touch(at(2)),
    ]);
    expect(effects).toEqual([
      {
        kind: 'rejected',
        reason: { code: 'notAdjacent', u: 0, v: 2 },
        action: { type: 'join', u: 0, v: 2 },
      },
    ]);
    expect(garden(controller.session)).toBe(trap.start);
  });

  it('a wrong step while dragging a chain is reported at once', () => {
    const chainLevel = levelById('4.1');
    const p = (v: number) => spot(chainLevel, v);
    const { effects } = feed(startController(chainLevel, 0), [
      { kind: 'press', point: p(0) },
      { kind: 'move', point: p(2) },
    ]);
    expect(effects).toMatchObject([{ kind: 'rejected', reason: { code: 'invalidPath' } }]);
  });

  it('undo, redo and the sun move through the day', () => {
    const played = feed(startController(trap, 0), [...touch(at(0)), ...touch(at(1))]).controller;
    const undone = handle(played, { kind: 'undo' }, 0).controller;
    expect(garden(undone.session)).toBe(trap.start);
    expect(garden(handle(undone, { kind: 'redo' }, 0).controller.session)).toBe(
      garden(played.session),
    );
    expect(garden(handle(played, { kind: 'seek', fraction: 0 }, 0).controller.session)).toBe(
      trap.start,
    );
  });

  it('a hint lights up its sprouts; at grade 3 the mentor also makes the move', () => {
    const festival = levelById('4.1');
    let controller = startController(festival, 0);
    const shown = [];
    for (let grade = 1; grade <= 3; grade++) {
      const step = handle(controller, { kind: 'hint' }, grade * HINT_DELAY_MS);
      controller = step.controller;
      shown.push(step.effects);
    }
    expect(shown[1]).toEqual([
      { kind: 'hint', content: expect.objectContaining({ line: 'ch4.1.sauce.02' }) },
    ]);
    expect(shown[2]?.map((effect) => effect.kind)).toEqual(['hint', 'animate']);
    expect(controller.highlight).toEqual([0, 1, 2, 4]);
    expect(garden(controller.session).search?.label[0]).toBe('outer');
    expect(handle(startController(festival, 0), { kind: 'hint' }, 1).effects).toEqual([]);
  });

  it('the next accepted move puts the glow out', () => {
    const festival = levelById('4.1');
    const hinted = handle(
      startController(festival, 0),
      { kind: 'hint' },
      2 * HINT_DELAY_MS,
    ).controller;
    const p = (v: number) => spot(festival, v);
    const moved = feed({ ...hinted, highlight: [5] }, [
      { kind: 'tool', tool: 'marks' },
      ...touch(p(0)),
    ]).controller;
    expect(moved.highlight).toEqual([]);
  });

  it('winning is announced once, with the stars; "Terminé" is a button', () => {
    const closed = levelById('4.9');
    const step = handle(startController(closed, 0), { kind: 'done' }, 0);
    expect(step.effects).toContainEqual({
      kind: 'won',
      stars: { total: 2, noHints: true, withinWater: null },
    });
    const again = handle(step.controller, { kind: 'done' }, 0);
    expect(again.effects.some((effect) => effect.kind === 'won')).toBe(false);
  });

  it('plays a whole level from its gestures to the victory (5.1)', () => {
    const wild = levelById('5.1');
    const p = placesOf(wild);
    let controller = startController(wild, 0);
    let won = false;
    for (const action of wild.solution) {
      for (const gesture of gesturesFor(garden(controller.session), p, action)) {
        const events: UiEvent[] =
          gesture.kind === 'tool'
            ? [{ kind: 'tool', tool: gesture.tool }]
            : gesture.kind === 'done'
              ? [{ kind: 'done' }]
              : [
                  { kind: 'press', point: gesture.points[0] as Point },
                  ...gesture.points.slice(1).map((point) => ({ kind: 'move', point }) as UiEvent),
                  { kind: 'release', point: gesture.points[gesture.points.length - 1] as Point },
                ];
        const step = feed(controller, events);
        controller = step.controller;
        won ||= step.effects.some((effect) => effect.kind === 'won');
      }
    }
    expect(won).toBe(true);
  });
});
