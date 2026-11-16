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

/** `session` after `count` moves of its level's reference walkthrough, from the one at `from`. */
const played = (session: LevelSession, count: number, from = 0): LevelSession =>
  session.level.solution.slice(from, from + count).reduce((now, move) => {
    const tried = act(now, move, 0);
    expect(tried.outcome.ok).toBe(true);
    return tried.session;
  }, session);

describe('restarting the play step (GDD §5.2)', () => {
  it('takes the garden back to where the play step began, and refills the water spent since', () => {
    // 3.1 opens on a step that only looks; its play step begins once R, in the dark, is inspected.
    const level = levelOf('3.1');
    const start = played(openSession(level, 0).session, 1);
    expect(stepNow(start)?.step).toBe('play');
    expect(start.waterSpent).toBe(1);
    const moved = played(start, 4, 1);
    expect(moved.waterSpent).toBeGreaterThan(1);
    const restarted = restartSession(moved);
    // The drop of the look stays spent: restarting goes back to where the play step began.
    expect(garden(restarted)).toBe(garden(start));
    expect(restarted.waterSpent).toBe(1);
    expect(restarted.history.states).toEqual(start.history.states);
    expect(restarted.dayEvents).toEqual(start.dayEvents);
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
    // While 3.1 looks, inspecting a (who has a lantern) spends a drop and keeps the look going.
    const looked = act(opened.session, { type: 'inspect', vertex: 1 }, 0).session;
    const moved = { ...opened, session: looked, highlight: [0], vineGlow: null };
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
