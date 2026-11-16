import type { Level } from '@levels/build';
import { loadLevel } from '@levels/loader';
import { hintsAt } from '@levels/stepHints';
import { describe, expect, it } from 'vitest';
import { canUndo } from './history';
import {
  act,
  canAskHint,
  garden,
  openSession,
  stepNow,
  undoSession,
  type LevelSession,
} from './levelSession';
import { lookedIntoTheDark, lookRefusal, toolsNow } from './lookStep';
import { restartSession } from './restart';

/**
 * R–a=b–T in the fog (ids 0…3), as 3.1 is played: a step that only looks, then the play step that
 * marks. Inspecting a, who has a lantern, does not end the look; inspecting R, in the dark, does.
 */
const lookingLevel = (): Level => {
  const loaded = loadLevel({
    id: '3.1',
    sprouts: ['R', 'a', 'b', 'T'].map((label, i) => ({ label, x: 100 + 80 * i, y: 120 })),
    vines: [
      ['R', 'a'],
      ['a', 'b'],
      ['b', 'T'],
    ],
    lanterns: [['a', 'b']],
    goal: { visible: true, value: 2 },
    fog: true,
    water: 5,
    victory: { type: 'matchingSize', value: 2 },
    hints: [{ line: 'ch3.1.sauce.02' }],
    flow: [{ step: 'look' }, { step: 'play' }],
    unlocks: { actions: ['inspect', 'markRoot', 'markMoon'] },
    solution: [
      { type: 'inspect', vertex: 'R' },
      { type: 'markRoot', vertex: 'R' },
      { type: 'markMoon', from: 'R', to: 'a' },
      { type: 'inspect', vertex: 'b' },
      { type: 'markMoon', from: 'b', to: 'T' },
      { type: 'chain', path: ['R', 'a', 'b', 'T'] },
    ],
  });
  if (!loaded.ok) throw new Error(`fixture does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
};

/** Plays a move the session must take. */
const moved = (session: LevelSession, action: Parameters<typeof act>[1]): LevelSession => {
  const tried = act(session, action, 0);
  expect(tried.outcome.ok).toBe(true);
  return tried.session;
};

describe('a step that only looks (GDD 3.1)', () => {
  it('takes inspections alone: any other move is closed while it looks, and open while playing', () => {
    const look = { step: 'look' } as const;
    expect(lookRefusal(look, { type: 'markRoot', vertex: 0 })).toEqual({
      ok: false,
      reason: { code: 'actionClosed', action: 'markRoot' },
    });
    expect(lookRefusal(look, { type: 'inspect', vertex: 0 })).toBeNull();
    expect(
      lookRefusal({ step: 'play', reactions: [] }, { type: 'markRoot', vertex: 0 }),
    ).toBeNull();
    expect(lookRefusal(null, { type: 'markRoot', vertex: 0 })).toBeNull();
  });

  it('shows only the inspecting tool on the bar while it looks', () => {
    const tools = ['lanterns', 'marks', 'inspect'] as const;
    expect(toolsNow(tools, { step: 'look' })).toEqual(['inspect']);
    expect(toolsNow(tools, { step: 'play', reactions: [] })).toEqual(tools);
    expect(toolsNow(tools, null)).toEqual(tools);
  });

  it('is over once a sprout in the dark has been inspected, not one with a lantern', () => {
    const level = lookingLevel();
    const opened = openSession(level, 0).session;
    expect(stepNow(opened)?.step).toBe('look');
    expect(lookedIntoTheDark(garden(opened))).toBe(false);
    const refused = act(opened, { type: 'markRoot', vertex: 0 }, 0);
    expect(refused.outcome).toEqual({
      ok: false,
      reason: { code: 'actionClosed', action: 'markRoot' },
    });
    const lit = moved(opened, { type: 'inspect', vertex: 1 });
    expect(stepNow(lit)?.step).toBe('look');
    const looked = act(lit, { type: 'inspect', vertex: 0 }, 0);
    expect(lookedIntoTheDark(garden(looked.session))).toBe(true);
    expect(looked.effects).toContainEqual({ kind: 'play' });
    expect(stepNow(looked.session)?.step).toBe('play');
    expect(looked.session.won).toBeNull();
  });

  it('offers the level hints while it looks, as a play step does', () => {
    const level = lookingLevel();
    expect(hintsAt(level, 0)).toEqual(level.hints);
    expect(canAskHint(openSession(level, 0).session)).toBe(true);
  });

  it('the play step after it neither undoes nor restarts the look, and its drops stay spent', () => {
    const level = lookingLevel();
    let session = openSession(level, 0).session;
    session = moved(session, { type: 'inspect', vertex: 1 });
    session = moved(session, { type: 'inspect', vertex: 0 });
    expect(stepNow(session)?.step).toBe('play');
    expect(canUndo(session.history)).toBe(false);
    expect(undoSession(session).history.cursor).toBe(session.history.cursor);
    const played = moved(session, { type: 'markRoot', vertex: 0 });
    const restarted = restartSession(played);
    expect(garden(restarted)).toBe(garden(session));
    expect(restarted.waterSpent).toBe(2);
  });

  it('restarted while it looks, the garden goes back to its start and the drops come back', () => {
    const level = lookingLevel();
    const looking = moved(openSession(level, 0).session, { type: 'inspect', vertex: 1 });
    const restarted = restartSession(looking);
    expect(garden(restarted)).toBe(level.start);
    expect(restarted.waterSpent).toBe(0);
  });
});
