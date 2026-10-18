import { maximumSize } from '@core/edmonds/fast/maximum';
import { size } from '@core/matching/queries';
import type { Action, ActionType } from '@core/rules/actions';
import { actionsUnlockedBy, UNLOCKED_AT } from '@core/rules/permissions';
import { unwrap } from '@core/shared/result';
import type { Design } from '@levels/sandbox/design';
import { toPlayable } from '@levels/sandbox/toLevel';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { designArb } from '../../../tests/support/designs';
import { automatonLevel } from '../../../tests/support/fixtureLevels';
import { act, garden, openSession, seekSession, type LevelSession } from './levelSession';
import { solveSession } from './sandboxSolve';

/** Every action of the game: the free mode in teacher mode. */
const ALL = Object.keys(UNLOCKED_AT) as ActionType[];

/** A triangle A–B–C with a tail C–D, one lantern on A–B: lighting both needs folding the loop. */
const TRIANGLE: Design = {
  sprouts: [
    { label: 'A', x: 120, y: 100 },
    { label: 'B', x: 200, y: 100 },
    { label: 'C', x: 160, y: 160 },
    { label: 'D', x: 240, y: 180 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'A'],
    ['C', 'D'],
  ],
  lanterns: [['A', 'B']],
};

/** A session of a free garden, played with `actions`. */
const sessionOf = (design: Design, actions: readonly ActionType[]): LevelSession =>
  openSession(unwrap(toPlayable(design, actions)), 0).session;

/** Some moves of a player, read from numbers: whichever the rules accept are made. */
const playerMoves = fc.array(
  fc.tuple(
    fc.constantFrom('join', 'split', 'passLantern', 'markRoot', 'markMoon', 'foldAt', 'unfold'),
    fc.nat(23),
    fc.nat(23),
  ),
  { maxLength: 12 },
);

/** The action a player's numbers name. */
const actionOf = ([type, u, v]: [string, number, number]): Action => {
  switch (type) {
    case 'join':
    case 'split':
      return { type, u, v };
    case 'passLantern':
      return { type, from: u, to: v };
    case 'markRoot':
      return { type, vertex: u };
    case 'unfold':
      return { type, blossom: u };
    default:
      return { type: type === 'markMoon' ? 'markMoon' : 'foldAt', from: u, to: v };
  }
};

describe('the mechanical gardener solving a garden of the free mode', () => {
  it('property: from wherever the player left it, lights the most lanterns it holds', () => {
    fc.assert(
      fc.property(designArb({ maxSprouts: 16 }), playerMoves, (design, moves) => {
        const played = toPlayable(design, ALL);
        fc.pre(played.ok);
        if (!played.ok) return;
        let session = openSession(played.value, 0).session;
        for (const move of moves) session = act(session, actionOf(move), 0).session;
        const before = session.history.states.length;
        const solved = solveSession(session);
        expect(solved).not.toBeNull();
        if (solved === null) return;
        const { day } = solved;
        const after = solved.session;
        const dusk = garden(after);
        expect(size(dusk.matching)).toBe(maximumSize(dusk.graph));
        expect(dusk.declaredDone).toBe(true);
        // The run follows the player's day, and the sun walks every one of its steps.
        expect(day.states[0]).toBe(garden(session));
        expect(after.history.states).toHaveLength(before + day.states.length - 1);
        expect(after.history.cursor).toBe(after.history.states.length - 1);
        day.states.forEach((state, i) => {
          expect(garden(seekSession(after, before - 1 + i))).toBe(state);
        });
        expect(after.dayEvents).toHaveLength(after.history.states.length);
      }),
      { numRuns: 60 },
    );
  });

  it('folds the loop although the player cannot, and the player still cannot afterwards', () => {
    const session = sessionOf(TRIANGLE, actionsUnlockedBy('1.8'));
    expect(session.level.start.allowed.has('foldAt')).toBe(false);
    const solved = solveSession(session);
    expect(solved).not.toBeNull();
    if (solved === null) return;
    const folded = solved.day.events.flat().some((event) => event.type === 'contract');
    expect(folded).toBe(true);
    expect(size(garden(solved.session).matching)).toBe(2);
    for (const state of solved.day.states) {
      expect(state.allowed).toBe(session.level.start.allowed);
    }
    const refused = act(solved.session, { type: 'fold', loop: [0, 1, 2] }, 0).outcome;
    expect(refused).toEqual({ ok: false, reason: { code: 'actionLocked', action: 'fold' } });
  });

  it('does not win the garden for the player: "Terminé" is still the player\'s to say', () => {
    const solved = solveSession(sessionOf(TRIANGLE, ALL));
    expect(solved?.session.won).toBeNull();
    const won = act(solved?.session ?? sessionOf(TRIANGLE, ALL), { type: 'declareDone' }, 0);
    expect(won.session.won).not.toBeNull();
  });

  it('waits while the script holds the garden, as any move does', () => {
    const session = openSession(automatonLevel(), 0).session;
    expect(solveSession(session)).toBeNull();
  });
});
