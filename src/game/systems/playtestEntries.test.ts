import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { closedFlowerLevel, festivalLevel } from '../../../tests/support/fixtureLevels';
import { countAnswer } from './answerKey';
import { HINT_DELAY_MS } from './hints';
import { handle, startController, type Controller, type UiEvent } from './levelController';
import { garden } from './levelSession';
import { playtestEntries } from './playtestEntries';
import type { Piece } from './pond';

/** A thread where a reflection wins, for checks built by hand. */
const PIECE: Piece = { kind: 'thread', sprouts: [0, 1], strands: [], gain: 1 };

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
    const { entries } = play(startController(closedFlowerLevel(), 0), [{ kind: 'done' }], 9);
    expect(entries).toEqual([
      { kind: 'move', at: 9, level: '4.9', action: 'declareDone' },
      { kind: 'claim', at: 9, level: '4.9', right: true },
      { kind: 'levelEnd', at: 9, level: '4.9', outcome: 'won', stars: 2 },
    ]);
  });

  it('"Terminé" short of the most lanterns is a claim without reason', () => {
    const { entries } = play(startController(festivalLevel(), 0), [{ kind: 'done' }]);
    expect(entries).toContainEqual({ kind: 'claim', at: 0, level: '4.1', right: false });
  });

  it('a hint opened is logged with its grade; one not on offer yet is not', () => {
    const festival = startController(festivalLevel(), 0);
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

  it('a wrong answer then the right one are both logged, with the step that asked', () => {
    const { entries } = play(
      startController(level, 0),
      [
        { kind: 'answer', option: 0 },
        { kind: 'answer', option: 1 },
      ],
      7,
    );
    expect(entries).toEqual([
      { kind: 'answer', at: 7, level: '2.9', step: 0, option: 0, right: false },
      { kind: 'answer', at: 7, level: '2.9', step: 0, option: 1, right: true },
      { kind: 'levelEnd', at: 7, level: '2.9', outcome: 'won', stars: 2 },
    ]);
  });

  it('an option the question does not have is no answer and logs nothing', () => {
    expect(play(startController(level, 0), [{ kind: 'answer', option: 5 }]).entries).toEqual([]);
  });
});

/** A small level whose script is only `flow`, over a garden of two sprouts. */
const scripted = (flow: unknown[], extra: Record<string, unknown> = {}): Level => {
  const loaded = loadLevel({
    id: '1.9',
    sprouts: [
      { label: 'A', x: 100, y: 100 },
      { label: 'B', x: 200, y: 100 },
    ],
    vines: [['A', 'B']],
    goal: { visible: false },
    flow,
    solution: [{ type: 'answer', option: 0 }],
    ...extra,
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
};

describe('playtest entries of bets, counts and the notebook', () => {
  it('a bet is logged with its value, whether it was right and whether it was informal', () => {
    const bet = scripted([{ step: 'bet', prompt: 'ch1.9.sauce.00', range: 3, informal: true }]);
    const { entries } = play(startController(bet, 0), [{ kind: 'bet', value: 1 }], 3);
    expect(entries).toEqual([
      { kind: 'bet', at: 3, level: '1.9', value: 1, right: true, informal: true },
      { kind: 'levelEnd', at: 3, level: '1.9', outcome: 'won', stars: 2 },
    ]);
  });

  it('a number in a count is logged as an answer, right or not', () => {
    const pond = levelById('2.2');
    const opened = play(startController(pond, 0), [{ kind: 'tapGarden' }]).controller;
    const step = opened.session.flow.index;
    const question = opened.session.flow.steps[step];
    if (question?.step !== 'count' || pond.mirror === null) throw new Error('2.2 counts first');
    const right = countAnswer(pond, garden(opened.session), question);
    const wrong = right === 0 ? 1 : 0;
    const { entries } = play(opened, [
      { kind: 'answer', option: wrong },
      { kind: 'answer', option: right },
    ]);
    expect(entries).toEqual([
      { kind: 'answer', at: 0, level: '2.2', step, option: wrong, right: false },
      { kind: 'answer', at: 0, level: '2.2', step, option: right, right: true },
    ]);
  });

  it('a false notebook statement is logged, and so is the counterexample it opens', () => {
    const counterexample = {
      mode: 'play',
      line: 'ch1.9.sauce.02',
      sprouts: [
        { label: 'A', x: 90, y: 120 },
        { label: 'B', x: 150, y: 120 },
      ],
      vines: [['A', 'B']],
      lanterns: [],
      actions: ['join'],
    };
    const notebook = scripted([{ step: 'notebook' }], {
      notebook: {
        prompt: 'ch1.9.notebook.00',
        options: [
          { line: 'ch1.9.notebook.01', correct: true },
          { line: 'ch1.9.notebook.02', correct: false, counterexample },
          { line: 'ch1.9.notebook.03', correct: false },
        ],
      },
    });
    const { entries } = play(startController(notebook, 0), [
      { kind: 'answer', option: 1 },
      { kind: 'answer', option: 2 },
      { kind: 'answer', option: 0 },
    ]);
    expect(entries).toEqual([
      { kind: 'notebook', at: 0, level: '1.9', option: 1, right: false },
      { kind: 'counterexample', at: 0, level: '1.9', option: 1 },
      { kind: 'notebook', at: 0, level: '1.9', option: 2, right: false },
      { kind: 'notebook', at: 0, level: '1.9', option: 0, right: true },
      { kind: 'levelEnd', at: 0, level: '1.9', outcome: 'won', stars: 2 },
    ]);
  });
});

describe('playtest entries of the mirror challenge', () => {
  const mirror = levelById('2.4');

  it('a check that does not beat the garden is logged as neither beating nor counted', () => {
    const { entries } = play(startController(mirror, 0), [{ kind: 'checkMirror' }], 4);
    expect(entries).toEqual([
      { kind: 'mirrorCheck', at: 4, level: '2.4', beats: false, counted: false },
    ]);
  });

  it('a better reflection counts once; checked again, it beats but does not count', () => {
    const before = startController(mirror, 0);
    const checked = (fresh: boolean) =>
      playtestEntries(
        before,
        { kind: 'checkMirror' },
        {
          controller: before,
          effects: [
            {
              kind: 'mirrorChecked',
              check: { kind: 'better', pieces: [], piece: PIECE, fresh },
            },
          ],
        },
        0,
      );
    expect(checked(true)).toEqual([
      { kind: 'mirrorCheck', at: 0, level: '2.4', beats: true, counted: true },
    ]);
    expect(checked(false)).toEqual([
      { kind: 'mirrorCheck', at: 0, level: '2.4', beats: true, counted: false },
    ]);
  });
});
