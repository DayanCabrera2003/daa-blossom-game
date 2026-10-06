import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { gesturesFor } from '../input/gestures';
import type { Point } from '../input/target';
import { HINT_DELAY_MS } from './hints';
import { garden } from './levelSession';
import {
  openController,
  startController,
  handle,
  type Controller,
  type UiEvent,
} from './levelController';

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

/** A path A–B–C–D with B=C lit and a reflection A=B, C=D, whose script is `flow`. */
const scripted = (flow: unknown[]): Level => {
  const plays = flow.some((step) => (step as { step: string }).step === 'play');
  const loaded = loadLevel({
    id: '2.9',
    sprouts: [
      { label: 'A', x: 100, y: 100 },
      { label: 'B', x: 200, y: 100 },
      { label: 'C', x: 300, y: 100 },
      { label: 'D', x: 400, y: 100 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ],
    lanterns: [['B', 'C']],
    mirror: [
      ['A', 'B'],
      ['C', 'D'],
    ],
    goal: { visible: false },
    ...(plays ? { victory: { type: 'matchingSize', value: 1 } } : {}),
    flow,
    solution: [{ type: 'tapGarden' }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};
const question = {
  step: 'ask',
  prompt: 'ch2.9.sauce.01',
  options: [
    { line: 'ch2.9.sauce.02', correct: false },
    { line: 'ch2.9.sauce.03', correct: true },
  ],
};

describe('the level controller runs the script', () => {
  it('opens with the effects of the first steps', () => {
    const opened = openController(levelById('4.6'), 0);
    expect(opened.effects).toEqual([{ kind: 'say', lines: ['ch4.6.sauce.00'] }, { kind: 'play' }]);
    expect(opened.controller).toEqual(startController(levelById('4.6'), 0));
  });

  it('answers and bets reach the script; finishing it is the win, with its stars', () => {
    const level = scripted([{ step: 'bet', prompt: 'ch2.9.sauce.04', range: 3 }, question]);
    const { controller, effects } = feed(startController(level, 0), [
      { kind: 'bet', value: 2 },
      { kind: 'answer', option: 1 },
    ]);
    expect(effects).toEqual([
      { kind: 'answered', step: 0, value: 2, correct: true },
      {
        kind: 'ask',
        step: 1,
        prompt: 'ch2.9.sauce.01',
        options: ['ch2.9.sauce.02', 'ch2.9.sauce.03'],
      },
      { kind: 'answered', step: 1, value: 1, correct: true },
      { kind: 'won', stars: { total: 3, noHints: true, withinWater: null } },
    ]);
    expect(controller.session.won?.total).toBe(3);
  });

  it('under a question, a touch on the garden is no move: it is refused with notNow', () => {
    const level = scripted([question, { step: 'play' }]);
    const p = (v: number) => spot(level, v);
    const { controller, effects } = feed(startController(level, 0), [
      { kind: 'tool', tool: 'lanterns' },
      ...touch({ x: (p(1).x + p(2).x) / 2, y: p(1).y }),
    ]);
    expect(effects).toMatchObject([{ kind: 'rejected', reason: { code: 'notNow' } }]);
    expect(garden(controller.session)).toBe(level.start);
  });

  it('a press on the garden while separating is a touch for the script, not a move', () => {
    const level = scripted([{ step: 'separate' }, question]);
    const { effects } = feed(startController(level, 0), [
      { kind: 'press', point: { x: 250, y: 200 } },
    ]);
    expect(effects.map((effect) => effect.kind)).toEqual(['ask']);
    const tapped = handle(startController(level, 0), { kind: 'tapGarden' }, 0);
    expect(tapped.effects.map((effect) => effect.kind)).toEqual(['ask']);
  });

  it('while exploring, a press on a sprout is a touch on it; elsewhere it is nothing', () => {
    const level = scripted([{ step: 'explore' }, question]);
    const missed = feed(startController(level, 0), [{ kind: 'press', point: { x: 250, y: 200 } }]);
    expect(missed.effects).toEqual([]);
    const { effects } = feed(startController(level, 0), [{ kind: 'press', point: spot(level, 2) }]);
    expect(effects.map((effect) => effect.kind)).toEqual(['sproutTapped', 'ask']);
    expect(
      handle(startController(level, 0), { kind: 'tapSprout', vertex: 1 }, 0).effects[0],
    ).toEqual({ kind: 'sproutTapped', vertex: 1 });
  });

  it('moving the sun through the day ends the sun step; a sun that stays put does not', () => {
    const level = scripted([{ step: 'play' }, { step: 'sun' }, question]);
    const p = (v: number) => spot(level, v);
    const won = feed(startController(level, 0), [
      { kind: 'tool', tool: 'lanterns' },
      ...touch({ x: (p(1).x + p(2).x) / 2, y: p(1).y }),
      ...touch(p(0)),
      ...touch(p(1)),
    ]).controller;
    expect(handle(won, { kind: 'redo' }, 0).effects).toEqual([]);
    expect(handle(won, { kind: 'undo' }, 0).effects.map((effect) => effect.kind)).toEqual(['ask']);
    expect(handle(won, { kind: 'seek', fraction: 0 }, 0).effects.map((e) => e.kind)).toEqual([
      'ask',
    ]);
  });

  it('drawing a reflection is accepted but does nothing yet (plan 03, phase 8)', () => {
    const level = scripted([{ step: 'draw', attempts: 1 }]);
    const controller = startController(level, 0);
    for (const event of [{ kind: 'drawToggle', u: 0, v: 1 }, { kind: 'checkMirror' }] as const) {
      expect(handle(controller, event, 0)).toEqual({ controller, effects: [] });
    }
  });
});

/** A 0.5-like level: light two lanterns on the path A–B–C–D, then move the sun through the day. */
const sunLevel = (): Level => {
  const loaded = loadLevel({
    id: '0.5',
    sprouts: [
      { label: 'A', x: 100, y: 100 },
      { label: 'B', x: 200, y: 100 },
      { label: 'C', x: 300, y: 100 },
      { label: 'D', x: 400, y: 100 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ],
    goal: { visible: true, value: 2 },
    victory: { type: 'matchingSize', value: 2 },
    flow: [{ step: 'play' }, { step: 'sun' }],
    solution: [
      { type: 'join', u: 'A', v: 'B' },
      { type: 'join', u: 'C', v: 'D' },
      { type: 'seekSun', fraction: 0 },
    ],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

describe('the sun as a step (0.5)', () => {
  const level = sunLevel();
  const p = (v: number) => spot(level, v);
  const join = (u: number, v: number): UiEvent[] => [...touch(p(u)), ...touch(p(v))];

  it('two lanterns are not enough: the level ends only once the sun moves', () => {
    const lit = feed(startController(level, 0), [...join(0, 1), ...join(2, 3)]);
    expect(lit.effects.map((effect) => effect.kind)).toEqual(['animate', 'animate', 'sun']);
    expect(lit.controller.session.won).toBeNull();
    const moved = handle(lit.controller, { kind: 'seek', fraction: 0.5 }, 0);
    expect(moved.effects.map((effect) => effect.kind)).toEqual(['won']);
    expect(moved.controller.session.won).not.toBeNull();
  });

  it('moving the sun before winning does not count: the step has not come yet', () => {
    const early = feed(startController(level, 0), [
      ...join(0, 1),
      { kind: 'undo' },
      { kind: 'redo' },
      { kind: 'seek', fraction: 0 },
      { kind: 'seek', fraction: 1 },
      ...join(2, 3),
    ]);
    expect(early.effects.map((effect) => effect.kind)).toEqual(['animate', 'animate', 'sun']);
    expect(early.controller.session.won).toBeNull();
    const undone = handle(early.controller, { kind: 'undo' }, 0);
    expect(undone.effects.map((effect) => effect.kind)).toEqual(['won']);
  });
});

describe('reactions during play (1.4)', () => {
  /** A in the dark; `A–B=C–D=E` ends in a dead end, `A–F=G–H` in H, in the dark. */
  const alley = (): Level => {
    const loaded = loadLevel({
      id: '1.4',
      sprouts: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((label, i) => ({
        label,
        x: 40 + 50 * i,
        y: 135,
      })),
      vines: [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'E'],
        ['A', 'F'],
        ['F', 'G'],
        ['G', 'H'],
      ],
      lanterns: [
        ['B', 'C'],
        ['D', 'E'],
        ['F', 'G'],
      ],
      goal: { visible: true, value: 4 },
      victory: { type: 'matchingSize', value: 4 },
      flow: [{ step: 'play', reactions: [{ on: 'gainZeroChain', say: ['ch1.4.sauce.01'] }] }],
      solution: [{ type: 'chain', path: ['A', 'F', 'G', 'H'] }],
    });
    if (!loaded.ok) throw new Error('fixture does not load');
    return loaded.value;
  };

  /** The events of the gestures that make `path` as a chain in the garden of `controller`. */
  const chainEvents = (controller: Controller, path: number[]): UiEvent[] =>
    gesturesFor(garden(controller.session), controller.positions, { type: 'chain', path }).flatMap(
      (gesture): UiEvent[] =>
        gesture.kind === 'tool'
          ? [{ kind: 'tool', tool: gesture.tool }]
          : gesture.kind === 'done'
            ? [{ kind: 'done' }]
            : [
                { kind: 'press', point: gesture.points[0] as Point },
                ...gesture.points.slice(1).map((point): UiEvent => ({ kind: 'move', point })),
                { kind: 'release', point: gesture.points[gesture.points.length - 1] as Point },
              ],
    );

  it('dragging the dead-end chain is animated, then the mentor speaks, only the first time', () => {
    const start = startController(alley(), 0);
    const first = feed(start, chainEvents(start, [0, 1, 2, 3, 4]));
    expect(first.effects.map((effect) => effect.kind)).toEqual(['animate', 'say']);
    expect(first.effects[1]).toEqual({ kind: 'say', lines: ['ch1.4.sauce.01'] });
    const undone = handle(first.controller, { kind: 'undo' }, 0).controller;
    const again = feed(undone, chainEvents(undone, [0, 1, 2, 3, 4]));
    expect(again.effects.map((effect) => effect.kind)).toEqual(['animate']);
  });
});
