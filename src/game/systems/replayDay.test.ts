import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { act, startSession, undoSession, type LevelSession } from './levelSession';
import { dayToReplay } from './replayDay';

/** A 1.1-like level: the path A–B–C–D, played until two lanterns, then the day replays a demo. */
const level = ((): Level => {
  const loaded = loadLevel({
    id: '1.1',
    sprouts: [
      { label: 'A', x: 60, y: 60 },
      { label: 'B', x: 200, y: 135 },
      { label: 'C', x: 280, y: 135 },
      { label: 'D', x: 420, y: 210 },
    ],
    vines: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
    ],
    goal: { visible: true, value: 2 },
    victory: { type: 'matchingSize', value: 2 },
    flow: [
      { step: 'play' },
      {
        step: 'replay',
        demo: [
          { type: 'join', u: 'B', v: 'C' },
          { type: 'passLantern', from: 'A', to: 'B' },
          { type: 'join', u: 'C', v: 'D' },
        ],
      },
    ],
    solution: [
      { type: 'join', u: 'A', v: 'B' },
      { type: 'join', u: 'C', v: 'D' },
    ],
  });
  if (!loaded.ok) throw new Error('fixture does not load');
  return loaded.value;
})();

const demo = (() => {
  const step = level.flow[1];
  if (step?.step !== 'replay' || step.demo === undefined) throw new Error('no demo');
  return step.demo;
})();

/** Plays the moves of the player (ids) through a session, with undo as -1. */
const play = (moves: readonly ([number, number] | -1)[]): LevelSession =>
  moves.reduce(
    (session, move) =>
      move === -1
        ? undoSession(session)
        : act(session, { type: 'join', u: move[0], v: move[1] }, 0).session,
    startSession(level, 0),
  );

describe('the day a replay shows', () => {
  it("without a demo, the player's own day, dawn to dusk", () => {
    const session = play([
      [0, 1],
      [2, 3],
    ]);
    expect(dayToReplay(level, session.history.states, null)).toBe(session.history.states);
  });

  it('a demo plays from the start of the level: B gives its lantern to A, whatever the player did', () => {
    const straight = play([
      [0, 1],
      [2, 3],
    ]);
    const undoing = play([[1, 2], -1, [0, 1], [2, 3]]);
    for (const session of [straight, undoing]) {
      const day = dayToReplay(level, session.history.states, demo);
      expect(day.map((state) => state.matching.mate)).toEqual([
        [-1, -1, -1, -1],
        [-1, 2, 1, -1],
        [1, 0, -1, -1],
        [1, 0, 3, 2],
      ]);
    }
  });

  it('a demo may use actions the level has not unlocked; the player keeps their own day', () => {
    const early = loadLevel({ ...JSON.parse(JSON.stringify(level.data)), id: '0.4' });
    if (!early.ok) throw new Error('fixture does not load');
    expect(early.value.start.allowed.has('passLantern')).toBe(false);
    const session = startSession(early.value, 0);
    expect(dayToReplay(early.value, session.history.states, demo)).toHaveLength(4);
    expect(session.history.states).toHaveLength(1);
  });
});
