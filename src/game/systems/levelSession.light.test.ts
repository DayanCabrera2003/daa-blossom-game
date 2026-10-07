import { describe, expect, it } from 'vitest';
import { lightLevel } from '../../../tests/support/fixtureLevels';
import { act, garden, openSession, respond, stepNow } from './levelSession';
import { lightDay } from './lightSearch';
import { NOT_NOW } from './refusal';

// The festival garden: R a b c d e = 0…5; the script opens with the light's own search.
const level = lightLevel();

describe('a level session where the light searches by itself (4.1, 4.2)', () => {
  it('opens on the light, which waits to be shown, with the garden still unmarked', () => {
    const { session, effects } = openSession(level, 0);
    expect(effects).toEqual([{ kind: 'autoSearch', step: 0 }]);
    expect(stepNow(session)?.step).toBe('autoSearch');
    expect(garden(session)).toBe(level.start);
    const tried = act(session, { type: 'markRoot', vertex: 0 }, 0);
    expect(tried.outcome).toEqual({ ok: false, reason: NOT_NOW });
    expect(tried.session.rejections).toBe(0);
  });

  it('once shown, its moves are in the day, accepted, and the script goes on', () => {
    const { session } = openSession(level, 0);
    const searched = respond(session, { type: 'searched' }, 0);
    expect(searched.session.history.states).toEqual(lightDay(level.start));
    expect(searched.session.history.cursor).toBe(3);
    expect(stepNow(searched.session)?.step).toBe('pickVine');
    expect(searched.effects).toEqual([{ kind: 'pickVine', step: 1, prompt: 'ch4.2.sauce.01' }]);
    // The conflict of the light's search is the vine to point at.
    const picked = respond(searched.session, { type: 'pickVine', u: 4, v: 2 }, 0);
    expect(picked.effects[0]).toMatchObject({ kind: 'vinePicked', correct: true });
  });

  it('news of the light outside its step changes nothing', () => {
    const { session } = openSession(level, 0);
    const searched = respond(session, { type: 'searched' }, 0).session;
    const again = respond(searched, { type: 'searched' }, 0);
    expect(again.session.history).toBe(searched.history);
    expect(again.effects).toEqual([]);
  });
});
