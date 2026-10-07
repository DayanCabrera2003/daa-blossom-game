import { describe, expect, it } from 'vitest';
import { bloomLevel } from '../../../tests/support/fixtureLevels';
import { FLOWER_MISSES_BEFORE_SPARED } from './flowerChallenge';
import { act, drawInGarden, garden, respond, startSession, stepNow } from './levelSession';

// The bloom garden: b c d f g e t h x = 0…8; the script opens on the flower challenge.
const level = bloomLevel();

describe('a level session runs the flower challenge (4.11)', () => {
  it('each chain drawn is cut at the flower and counted, and never changes the garden', () => {
    const session = startSession(level, 0);
    expect(stepNow(session)?.step).toBe('flowerChallenge');
    const drawn = drawInGarden(session, [6, 8, 7, 2, 1, 5], 0);
    expect(drawn.attempt).toMatchObject({ kind: 'cut', argument: { stretch: [6, 8, 7, 2] } });
    expect(drawn.session.flower.chains).toBe(1);
    expect(drawn.session.flow.attempts).toBe(1);
    expect(garden(drawn.session)).toBe(garden(session));
    expect(drawn.effects).toEqual([]);
  });

  it('a drawing that is no chain is refused gently and does not count', () => {
    const drawn = drawInGarden(startSession(level, 0), [6, 8, 7], 0);
    expect(drawn.attempt).toMatchObject({ kind: 'notAChain', spared: false });
    expect(drawn.session.flow.attempts).toBe(0);
    expect(drawn.session.flower.misses).toBe(1);
  });

  it('three chains end the step, and the script goes on', () => {
    let session = startSession(level, 0);
    for (const path of [
      [6, 8, 7, 2, 1, 5],
      [5, 1, 2, 3, 4, 0],
    ])
      session = drawInGarden(session, path, 0).session;
    const last = drawInGarden(session, [5, 6], 0);
    expect(last.effects).toEqual([
      { kind: 'say', lines: ['ch4.11.sauce.01'] },
      { kind: 'finished' },
    ]);
    expect(last.session.won).not.toBeNull();
  });

  it('enough drawings that are no chains let the player go anyway', () => {
    let session = startSession(level, 0);
    for (let k = 1; k < FLOWER_MISSES_BEFORE_SPARED; k++)
      session = drawInGarden(session, [6, 8], 0).session;
    const spared = drawInGarden(session, [6, 8], 0);
    expect(spared.attempt).toMatchObject({ kind: 'notAChain', spared: true });
    expect(spared.effects.at(-1)).toEqual({ kind: 'finished' });
  });

  it('outside the challenge nothing is drawn, and under it the garden takes no move', () => {
    const session = startSession(level, 0);
    expect(act(session, { type: 'join', u: 5, v: 6 }, 0).outcome).toEqual({
      ok: false,
      reason: { code: 'notNow' },
    });
    const over = [
      [6, 8, 7, 2, 1, 5],
      [5, 1, 2, 3, 4, 0],
      [5, 6],
    ].reduce((s, path) => drawInGarden(s, path, 0).session, session);
    expect(stepNow(over)).toBeNull();
    expect(drawInGarden(over, [5, 6], 0)).toEqual({ session: over, attempt: null, effects: [] });
    expect(respond(over, { type: 'tap' }, 0).effects).toEqual([]);
  });
});
