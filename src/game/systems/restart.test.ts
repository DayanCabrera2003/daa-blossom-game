import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import type { Level } from '@levels/build';
import { canRedo, canUndo } from './history';
import { handle, openController, startController } from './levelController';
import { act, garden, openSession, respond, stepNow, type LevelSession } from './levelSession';
import { restartSession } from './restart';

/** The level of the catalog with id `id`. */
const levelOf = (id: string): Level => {
  const found = catalog().find((level) => level.data.id === id);
  if (found === undefined) throw new Error(`no level ${id}`);
  return found;
};

/** `session` after the first `count` moves of its level's reference walkthrough. */
const played = (session: LevelSession, count: number): LevelSession =>
  session.level.solution.slice(0, count).reduce((now, move) => {
    const tried = act(now, move, 0);
    expect(tried.outcome.ok).toBe(true);
    return tried.session;
  }, session);

describe('restarting the play step (GDD §5.2)', () => {
  it('takes the garden back to where the play step began, and refills the water spent since', () => {
    // 3.1 opens on its play step, with fog and water; its walkthrough starts by inspecting.
    const level = levelOf('3.1');
    const start = openSession(level, 0).session;
    expect(stepNow(start)?.step).toBe('play');
    const moved = played(start, 4);
    expect(moved.waterSpent).toBeGreaterThan(0);
    const restarted = restartSession(moved);
    expect(garden(restarted)).toBe(level.start);
    expect(restarted.waterSpent).toBe(0);
    expect(restarted.history.states).toEqual([level.start]);
    expect(restarted.dayEvents).toEqual([[]]);
    // Restarting cannot be redone: the moves are gone, not undone.
    expect(canRedo(restarted.history)).toBe(false);
    // What the hints and the playtest counted stays.
    expect(restarted.hints).toBe(moved.hints);
    expect(restarted.flow).toBe(moved.flow);
  });

  it('keeps what the garden showed before the play step: the light of 4.1', () => {
    const opened = openSession(levelOf('4.1'), 0).session;
    const searched = respond(opened, { type: 'searched' }, 0).session;
    const moved = played(searched, 1);
    const restarted = restartSession(moved);
    expect(restarted.history.states).toEqual(searched.history.states);
    expect(restarted.history.cursor).toBe(searched.history.cursor);
    expect(canUndo(restarted.history)).toBe(false);
  });

  it('changes nothing outside a step that takes moves', () => {
    const opened = openSession(levelOf('4.1'), 0).session;
    expect(stepNow(opened)?.step).toBe('autoSearch');
    expect(restartSession(opened)).toBe(opened);
  });

  it('through the controller: the half-drawn chain and the glows go, the tool in hand stays', () => {
    const level = levelOf('3.1');
    const opened = startController(level, 0);
    const moved = { ...opened, session: played(opened.session, 2), highlight: [0], vineGlow: null };
    const step = handle(moved, { kind: 'restart' }, 0);
    expect(step.effects).toEqual([]);
    expect(garden(step.controller.session)).toBe(level.start);
    expect(step.controller.highlight).toEqual([]);
    expect(step.controller.pointer.tool).toBe(opened.pointer.tool);
    expect(step.controller.pointer.chain).toBeNull();
    expect(openController(level, 0).controller.session.history).toEqual(
      step.controller.session.history,
    );
  });
});
