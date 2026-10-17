import { describe, expect, it } from 'vitest';
import { betrayalLevel, festivalLevel } from '../../../tests/support/fixtureLevels';
import {
  act,
  respond,
  startSession,
  undoSession,
  type LevelSession,
} from '../systems/levelSession';
import { splitBadges } from './splitBadge';

/** A session of `level` after its reference moves. */
const searched = (level = betrayalLevel()): LevelSession =>
  level.solution.reduce(
    (session, action) => act(session, action, 0).session,
    startSession(level, 0),
  );

describe('the split badge: half sun, half moon, over the loop of the conflict (4.2)', () => {
  it('shows nothing before the conflict is pointed at, nor after a wrong vine', () => {
    const session = searched();
    expect(splitBadges(session)).toEqual([]);
    expect(splitBadges(respond(session, { type: 'pickVine', u: 2, v: 3 }, 0).session)).toEqual([]);
  });

  it('after the right vine, flashes over c and d: going round the other way swaps their marks', () => {
    const pointed = respond(searched(), { type: 'pickVine', u: 4, v: 2 }, 0).session;
    // The base b is a sun whichever way the loop is walked; c and d can be either.
    expect(splitBadges(pointed)).toEqual([3, 4]);
  });

  it('fades once the garden shows the conflict no more (the free garden after the script)', () => {
    const pointed = respond(searched(), { type: 'pickVine', u: 4, v: 2 }, 0).session;
    const counted = respond(pointed, { type: 'answer', option: 3 }, 0).session;
    expect(counted.won).not.toBeNull();
    expect(splitBadges(undoSession(counted))).toEqual([]);
  });

  it('a level that never points at a conflict shows no split badge', () => {
    const festival = festivalLevel();
    const session = festival.solution
      .slice(0, 3)
      .reduce((s, action) => act(s, action, 0).session, startSession(festival, 0));
    expect(splitBadges(session)).toEqual([]);
  });
});
