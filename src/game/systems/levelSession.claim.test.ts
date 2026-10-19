import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { invariant } from '@core/shared/invariant';
import { describe, expect, it } from 'vitest';
import { councilLevel } from '../../../tests/support/secretScripts';
import { HINT_REJECTIONS } from './hints';
import { act, isHintAvailable, startSession, stepNow, type LevelSession } from './levelSession';

/** A level of the catalog by its id. */
function levelOf(id: string): Level {
  const found = catalog().find((level) => level.data.id === id);
  invariant(found !== undefined, `the catalog has level ${id}`);
  return found;
}

/** 1.8 being played with three lanterns lit: a chain is left. */
function threeLanterns(): LevelSession {
  const level = levelOf('1.8');
  const id = (label: string): number => level.data.sprouts.findIndex((s) => s.label === label);
  // The script's opening line passes at once: the garden takes moves from the start.
  let session = startSession(level, 0);
  invariant(stepNow(session)?.step === 'play', '1.8 opens on its play step');
  for (const [u, v] of [
    ['B', 'C'],
    ['D', 'E'],
    ['F', 'G'],
  ] as const) {
    session = act(session, { type: 'join', u: id(u), v: id(v) }, 0).session;
  }
  return session;
}

describe('a "Terminé" that does not win the step', () => {
  it('is answered with why it falls short, and still counted as a wrong claim', () => {
    const claimed = act(threeLanterns(), { type: 'declareDone' }, 0);
    expect(claimed.outcome.ok).toBe(true);
    expect(claimed.claim).toEqual({ code: 'chainLeft' });
    expect(claimed.session.claims).toEqual({ right: 0, wrong: 1 });
    expect(claimed.session.won).toBeNull();
  });

  it('counts towards a hint like a refusal: three in a row offer one', () => {
    let session = threeLanterns();
    for (let i = 0; i < HINT_REJECTIONS; i++) {
      expect(isHintAvailable(session, 0)).toBe(false);
      session = act(session, { type: 'declareDone' }, 0).session;
    }
    expect(session.hints.rejections).toBe(HINT_REJECTIONS);
    expect(isHintAvailable(session, 0)).toBe(true);
  });

  it('any other move has no claim to answer', () => {
    // B and C share a lantern (sprouts 1 and 2).
    const split = act(threeLanterns(), { type: 'split', u: 1, v: 2 }, 0);
    expect(split.outcome.ok).toBe(true);
    expect(split.claim).toBeNull();
  });

  it('a claim that wins, or repeats stones the council knows, has nothing to answer', () => {
    let session = startSession(councilLevel(), 0);
    session = act(session, { type: 'join', u: 0, v: 1 }, 0).session;
    session = act(session, { type: 'join', u: 5, v: 6 }, 0).session;
    const won = act(session, { type: 'declareDone' }, 0);
    expect(won.claim).toBeNull();
    const again = act(won.session, { type: 'declareDone' }, 0);
    expect(again.effects).toContainEqual({ kind: 'sameStones', line: 'ch7.6.oaks.02' });
    expect(again.claim).toBeNull();
  });
});
