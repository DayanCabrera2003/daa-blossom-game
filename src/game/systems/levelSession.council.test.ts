import { describe, expect, it } from 'vitest';
import { councilLevel } from '../../../tests/support/secretScripts';
import { HINT_DELAY_MS } from './hints';
import {
  act,
  garden,
  isHintAvailable,
  startSession,
  stepNow,
  type LevelSession,
} from './levelSession';

const [a, b, , , , r, C] = [0, 1, 2, 3, 4, 5, 6];

/** The council of 7.6 once the four lanterns are lit and no stones are presented. */
function presentedOnce(): LevelSession {
  let session = startSession(councilLevel(), 0);
  session = act(session, { type: 'join', u: a, v: b }, 0).session;
  session = act(session, { type: 'join', u: r, v: C }, 0).session;
  return act(session, { type: 'declareDone' }, 0).session;
}

describe('a level session asks the council for another certificate', () => {
  it('the first certificate wins the play step, and the garden still takes moves', () => {
    const session = presentedOnce();
    expect(stepNow(session)?.step).toBe('certifyAgain');
    expect(session.certificates).toEqual([[]]);
    const lifted = act(session, { type: 'liftStone', vertex: C }, 0);
    expect(lifted.outcome.ok).toBe(true);
    expect(garden(lifted.session).stones).toEqual([C]);
  });

  it('presenting the same stones again is answered kindly and does not end the step', () => {
    const session = presentedOnce();
    // Lifting and dropping a stone takes "Terminé" back; presenting no stones again is no news.
    let again = act(session, { type: 'liftStone', vertex: C }, 0).session;
    again = act(again, { type: 'dropStone', vertex: C }, 0).session;
    const repeated = act(again, { type: 'declareDone' }, 0);
    expect(repeated.outcome.ok).toBe(true);
    expect(repeated.effects).toEqual([{ kind: 'sameStones', line: 'ch7.6.oaks.02' }]);
    expect(stepNow(repeated.session)?.step).toBe('certifyAgain');
    expect(repeated.session.won).toBeNull();
  });

  it('different stones that prove it end the step and the level', () => {
    let session = act(presentedOnce(), { type: 'liftStone', vertex: C }, 0).session;
    const proved = act(session, { type: 'declareDone' }, 0);
    expect(proved.effects).toContainEqual({ kind: 'finished' });
    expect(proved.session.certificates).toEqual([[], [C]]);
    expect(proved.session.won).not.toBeNull();
    // Once the script is over, nothing more is judged.
    session = act(proved.session, { type: 'liftStone', vertex: b }, 0).session;
    expect(act(session, { type: 'declareDone' }, 0).effects).toEqual([]);
  });

  it('a player stuck looking for another certificate is offered a hint', () => {
    expect(isHintAvailable(presentedOnce(), HINT_DELAY_MS)).toBe(true);
  });
});
