import { describe, expect, it } from 'vitest';
import { fivePetalsLevel, lightLevel } from '../../../tests/support/fixtureLevels';
import { act, openSession, respond, seekSession, undoSession } from './levelSession';
import { lightRun } from './lightSearch';

/**
 * The events of the day, kept beside its gardens (one list per garden, none at dawn), so the
 * teacher's panel can write the player's day as the rules answered it, in step with the sun.
 */
describe('the events of a level session', () => {
  it('start empty at dawn and grow by the events of each accepted move', () => {
    const level = fivePetalsLevel();
    const { session } = openSession(level, 0);
    expect(session.dayEvents).toEqual([[]]);
    const [first] = level.solution;
    if (first === undefined) throw new Error('4.6 has a solution');
    const moved = act(session, first, 0);
    expect(moved.outcome.ok).toBe(true);
    expect(moved.session.dayEvents).toEqual([[], moved.outcome.ok ? moved.outcome.events : []]);
    // A refused move leaves the events as they were.
    expect(act(moved.session, { type: 'unfold', blossom: 99 }, 0).session.dayEvents).toBe(
      moved.session.dayEvents,
    );
  });

  it('acting with the sun in the past drops the events of the future, as it drops its gardens', () => {
    const level = fivePetalsLevel();
    const [first, second] = level.solution;
    if (first === undefined || second === undefined) throw new Error('4.6 has two moves');
    const twice = act(act(openSession(level, 0).session, first, 0).session, second, 0).session;
    expect(twice.dayEvents).toHaveLength(3);
    const back = seekSession(undoSession(twice), 0);
    const again = act(back, first, 0).session;
    expect(again.dayEvents).toHaveLength(2);
    expect(again.dayEvents).toHaveLength(again.history.states.length);
  });

  it("the light's own search enters the day with its events", () => {
    const level = lightLevel();
    const searched = respond(openSession(level, 0).session, { type: 'searched' }, 0).session;
    expect(searched.dayEvents).toEqual(lightRun(level.start).events);
  });
});
