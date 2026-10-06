import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS } from './hints';
import { handle, startController, type Controller, type UiEvent } from './levelController';
import { playtestEntries } from './playtestEntries';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** Plays the events in order at time `at`, collecting the log entries each step gives. */
const play = (controller: Controller, events: UiEvent[], at = 0) => {
  let current = controller;
  const entries = [];
  for (const event of events) {
    const step = handle(current, event, at);
    entries.push(...playtestEntries(current, event, step, at));
    current = step.controller;
  }
  return { controller: current, entries };
};

/** A touch on sprout `v` of the level. */
const touch = (level: Level, v: number): UiEvent[] => {
  const sprout = level.data.sprouts[v];
  if (sprout === undefined) throw new Error(`no sprout ${v}`);
  const point = { x: sprout.x, y: sprout.y };
  return [
    { kind: 'press', point },
    { kind: 'release', point },
  ];
};

describe('playtest entries of a step', () => {
  const trap = levelById('1.1');

  it('an accepted move is logged by its type; pointing and choosing tools are not', () => {
    const { entries } = play(startController(trap, 0), [
      { kind: 'tool', tool: 'lanterns' },
      ...touch(trap, 0),
      ...touch(trap, 1),
    ]);
    expect(entries).toEqual([{ kind: 'move', at: 0, level: '1.1', action: 'join' }]);
  });

  it('a refused move is logged with its reason code', () => {
    const { entries } = play(startController(trap, 0), [{ kind: 'done' }], 5);
    expect(entries).toEqual([
      { kind: 'refused', at: 5, level: '1.1', action: 'declareDone', reason: 'actionLocked' },
    ]);
  });

  it('a refused chain or loop keeps its sub-reason in the code', () => {
    const before = startController(trap, 0);
    const step = {
      controller: before,
      effects: [
        {
          kind: 'rejected' as const,
          reason: {
            code: 'invalidPath' as const,
            error: { code: 'notAlternating' as const, index: 1 },
          },
          action: { type: 'chain' as const, path: [0, 1, 2] },
        },
      ],
    };
    expect(playtestEntries(before, { kind: 'release', point: { x: 0, y: 0 } }, step, 0)).toEqual([
      {
        kind: 'refused',
        at: 0,
        level: '1.1',
        action: 'chain',
        reason: 'invalidPath.notAlternating',
      },
    ]);
  });

  it('"Terminé" with the most lanterns is a right claim, and may win the level', () => {
    const { entries } = play(startController(levelById('4.9'), 0), [{ kind: 'done' }], 9);
    expect(entries).toEqual([
      { kind: 'move', at: 9, level: '4.9', action: 'declareDone' },
      { kind: 'claim', at: 9, level: '4.9', right: true },
      { kind: 'levelEnd', at: 9, level: '4.9', outcome: 'won', stars: 2 },
    ]);
  });

  it('"Terminé" short of the most lanterns is a claim without reason', () => {
    const { entries } = play(startController(levelById('4.1'), 0), [{ kind: 'done' }]);
    expect(entries).toContainEqual({ kind: 'claim', at: 0, level: '4.1', right: false });
  });

  it('a hint opened is logged with its grade; one not on offer yet is not', () => {
    const festival = startController(levelById('4.1'), 0);
    expect(play(festival, [{ kind: 'hint' }], 0).entries).toEqual([]);
    expect(play(festival, [{ kind: 'hint' }], HINT_DELAY_MS).entries).toEqual([
      { kind: 'hint', at: HINT_DELAY_MS, level: '4.1', grade: 1 },
    ]);
  });

  it('undo, redo and the sun are logged only when they move through the day', () => {
    const start = startController(trap, 0);
    expect(play(start, [{ kind: 'undo' }, { kind: 'seek', fraction: 1 }]).entries).toEqual([]);
    const { entries } = play(start, [
      ...touch(trap, 0),
      ...touch(trap, 1),
      { kind: 'undo' },
      { kind: 'redo' },
      { kind: 'seek', fraction: 0 },
      { kind: 'seek', fraction: 0 },
    ]);
    expect(entries.map((entry) => (entry.kind === 'history' ? entry.move : entry.kind))).toEqual([
      'move',
      'undo',
      'redo',
      'seek',
    ]);
  });
});

describe('playtest entries of a scripted level', () => {
  const loaded = loadLevel({
    id: '2.9',
    sprouts: [
      { label: 'A', x: 100, y: 100 },
      { label: 'B', x: 200, y: 100 },
    ],
    vines: [['A', 'B']],
    goal: { visible: false },
    flow: [
      {
        step: 'ask',
        prompt: 'ch2.9.sauce.01',
        options: [
          { line: 'ch2.9.sauce.02', correct: false },
          { line: 'ch2.9.sauce.03', correct: true },
        ],
        retry: true,
      },
    ],
    solution: [{ type: 'answer', option: 1 }],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  const level = loaded.value;

  it('a move under a question is logged as refused with notNow', () => {
    const { entries } = play(startController(level, 0), [...touch(level, 0), ...touch(level, 1)]);
    expect(entries).toEqual([
      { kind: 'refused', at: 0, level: '2.9', action: 'join', reason: 'notNow' },
    ]);
  });

  it('answers are not logged yet (plan 03, phase 10); finishing the script is the win', () => {
    const { entries } = play(startController(level, 0), [
      { kind: 'answer', option: 0 },
      { kind: 'answer', option: 1 },
    ]);
    expect(entries).toEqual([{ kind: 'levelEnd', at: 0, level: '2.9', outcome: 'won', stars: 2 }]);
  });
});
