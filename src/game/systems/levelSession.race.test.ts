import { describe, expect, it } from 'vitest';
import { racesLevel } from '../../../tests/support/fixtureLevels';
import { act, openSession, respond, stepNow } from './levelSession';
import { NOT_NOW } from './refusal';

// A race at 8 sprouts, a doubling bet on the automaton and one on Bruto, and a race at 16.
const level = racesLevel();

describe('a level session with races and doubling bets (6.4, 6.5)', () => {
  it('waits for the race to be shown, taking no move meanwhile', () => {
    const { session, effects } = openSession(level, 0);
    expect(effects).toEqual([{ kind: 'race', step: 0 }]);
    expect(act(session, { type: 'join', u: 0, v: 1 }, 0).outcome).toEqual({
      ok: false,
      reason: NOT_NOW,
    });
    const raced = respond(session, { type: 'raced' }, 0);
    expect(stepNow(raced.session)?.step).toBe('raceBet');
  });

  it('judges each doubling bet with the steps the core measured, then races again', () => {
    let { session } = openSession(level, 0);
    session = respond(session, { type: 'raced' }, 0).session;
    // 41 steps at 8 sprouts, 183 at 16: about four to eight times.
    const onAutomaton = respond(session, { type: 'answer', option: 1 }, 0);
    expect(onAutomaton.effects).toContainEqual({
      kind: 'answered',
      step: 1,
      value: 1,
      correct: true,
    });
    // Bruto falls asleep at 16: "about double" is wrong, but the race goes on all the same.
    const onBruto = respond(onAutomaton.session, { type: 'answer', option: 0 }, 0);
    expect(onBruto.effects).toContainEqual({ kind: 'answered', step: 2, value: 0, correct: false });
    expect(onBruto.effects).toContainEqual({ kind: 'race', step: 3 });
    const over = respond(onBruto.session, { type: 'raced' }, 0);
    expect(over.session.won).not.toBeNull();
  });
});
