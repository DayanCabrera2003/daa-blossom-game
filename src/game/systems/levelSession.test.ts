import type { Action } from '@core/rules/actions';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { loadLevel } from '@levels/loader';
import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS } from './hints';
import {
  act,
  askHint,
  garden,
  isHintAvailable,
  seekSession,
  startSession,
  undoSession,
  redoSession,
  type LevelSession,
} from './levelSession';

const levelById = (id: string): Level => {
  const level = catalog().find((l) => l.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};
const playAll = (session: LevelSession, actions: readonly Action[], now = 0) =>
  actions.reduce((s, action) => act(s, action, now).session, session);

describe('a level session', () => {
  it('playing 4.6 with its solution wins, with the star for no hints', () => {
    const level = levelById('4.6');
    const won = playAll(startSession(level, 0), level.solution);
    expect(won.won).toEqual({ total: 2, noHints: true, withinWater: null });
  });

  it('a wrong "Terminé" in 4.9 neither wins nor punishes: it is counted, and play goes on', () => {
    const level = levelById('4.9');
    const wrong = playAll(startSession(level, 0), [
      { type: 'split', u: 1, v: 2 },
      { type: 'declareDone' },
    ]);
    expect(wrong.won).toBeNull();
    expect(wrong.claims).toEqual({ right: 0, wrong: 1 });
    const fixed = playAll(undoSession(undoSession(wrong)), [{ type: 'declareDone' }]);
    expect(fixed.won).not.toBeNull();
    expect(fixed.claims).toEqual({ right: 1, wrong: 1 });
  });

  it('undo, redo and the sun move through the day; acting in the past drops the future', () => {
    const level = levelById('1.1');
    const played = playAll(startSession(level, 0), level.solution);
    expect(garden(undoSession(played)).matching).toEqual(garden(seekSession(played, 2)).matching);
    expect(garden(seekSession(played, 0))).toBe(level.start);
    expect(redoSession(undoSession(played)).history).toEqual(played.history);
    const branched = playAll(seekSession(played, 0), [{ type: 'join', u: 0, v: 1 }]);
    expect(branched.history.states).toHaveLength(2);
  });

  it('refusals are answered and counted, and three in a row offer a hint', () => {
    const level = levelById('1.1');
    let session = startSession(level, 0);
    for (let k = 0; k < 3; k++) {
      const result = act(session, { type: 'join', u: 0, v: 2 }, 10);
      expect(result.outcome).toMatchObject({ ok: false, reason: { code: 'notAdjacent' } });
      session = result.session;
    }
    expect(session.rejections).toBe(3);
    expect(isHintAvailable(session, 10)).toBe(true);
  });

  it('a hint opens grade by grade; at grade 3 the mentor makes the next step of the solution', () => {
    const level = levelById('4.1');
    let session = startSession(level, 0);
    const grades = [];
    for (let k = 1; k <= 3; k++) {
      const opened = askHint(session, k * HINT_DELAY_MS);
      if (opened === null) throw new Error('hint not offered');
      grades.push(opened.hint);
      session = opened.session;
    }
    expect(grades.map((hint) => hint.line)).toEqual([
      'ch4.1.sauce.01',
      'ch4.1.sauce.02',
      'ch4.1.sauce.03',
    ]);
    expect(grades[1]?.highlight).toEqual([5]);
    expect(grades[2]?.move).toEqual(level.solution[0]);
    expect(session.hints.opened).toBe(3);
    expect(askHint(startSession(level, 0), 1)).toBeNull();
  });

  it('water spent in the session is not given back by undoing (the water star)', () => {
    const foggy = loadLevel({
      id: '3.1',
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 200, y: 100 },
      ],
      vines: [['A', 'B']],
      goal: { visible: true, value: 1 },
      fog: true,
      water: 1,
      victory: { type: 'matchingSize', value: 1 },
      solution: [{ type: 'join', u: 'A', v: 'B' }],
    });
    if (!foggy.ok) throw new Error('fixture does not load');
    const looked = playAll(startSession(foggy.value, 0), [
      { type: 'inspect', vertex: 0 },
      { type: 'inspect', vertex: 1 },
    ]);
    const undone = undoSession(undoSession(looked));
    expect(undone.waterSpent).toBe(2);
    const won = playAll(undone, [{ type: 'join', u: 0, v: 1 }]);
    expect(won.won).toEqual({ total: 2, noHints: true, withinWater: false });
  });
});
