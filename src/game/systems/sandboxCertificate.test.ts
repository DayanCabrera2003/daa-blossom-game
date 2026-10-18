import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { bipartition } from '@core/graph/bipartition';
import { size } from '@core/matching/queries';
import type { Action, ActionType } from '@core/rules/actions';
import { actionsUnlockedBy, UNLOCKED_AT } from '@core/rules/permissions';
import { unwrap } from '@core/shared/result';
import type { Design } from '@levels/sandbox/design';
import { generate } from '@levels/sandbox/generators';
import { toPlayable } from '@levels/sandbox/toLevel';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { designArb } from '../../../tests/support/designs';
import { automatonLevel } from '../../../tests/support/fixtureLevels';
import { LAYOUT_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { act, garden, openSession, type LevelSession } from './levelSession';
import { certifySession, type CertificateKinds } from './sandboxCertificate';
import { solveSession } from './sandboxSolve';

/** Every action of the game: the free mode in teacher mode. */
const ALL = Object.keys(UNLOCKED_AT) as ActionType[];

/** Both certificates, as teacher mode (or a player past 7.4) knows them. */
const BOTH: CertificateKinds = { stones: true, scarecrows: true };

/** A triangle A–B–C with a tail C–D, one lantern on A–B. */
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

/** A row A–B–C–D, both its lanterns lit: nobody sleeps in the dark. */
const LIT_ROW: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100 },
    { label: 'B', x: 150, y: 100 },
    { label: 'C', x: 200, y: 100 },
    { label: 'D', x: 250, y: 100 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
  ],
  lanterns: [
    ['A', 'B'],
    ['C', 'D'],
  ],
};

/** A session of a free garden, played with `actions`. */
const sessionOf = (design: Design, actions: readonly ActionType[] = ALL): LevelSession =>
  openSession(unwrap(toPlayable(design, actions)), 0).session;

/** The session once the mechanical gardener has solved it. */
const solved = (session: LevelSession): LevelSession => {
  const after = solveSession(session);
  if (after === null) throw new Error('the gardener did not solve the garden');
  return after.session;
};

describe('the certificate of a free garden, on demand', () => {
  it('property: after the gardener, its stones prove the garden holds no more lanterns', () => {
    fc.assert(
      fc.property(designArb({ maxSprouts: 16 }), (design) => {
        const played = toPlayable(design, ALL);
        fc.pre(played.ok);
        if (!played.ok) return;
        const certified = certifySession(solved(openSession(played.value, 0).session), BOTH);
        expect(certified?.kind).toBe('certified');
        if (certified?.kind !== 'certified') return;
        const dusk = garden(certified.session);
        expect(checkTutteBerge(dusk.graph, dusk.matching, dusk.stones).ok).toBe(true);
        expect(dusk.declaredDone).toBe(true);
        const dark = dusk.graph.n - 2 * size(dusk.matching);
        expect(certified.stones).toEqual({
          stones: dusk.stones.length,
          groups: dusk.stones.length + dark,
          dark,
        });
        // Scarecrows only where bees and flowers make them a proof.
        const bees = bipartition(dusk.graph).kind === 'bipartite';
        expect(certified.scarecrows === null).toBe(!bees);
        if (bees) {
          expect(checkVertexCover(dusk.graph, dusk.scarecrows).ok).toBe(true);
          expect(dusk.scarecrows).toHaveLength(size(dusk.matching));
          expect(certified.scarecrows).toBe(size(dusk.matching));
        }
      }),
      { numRuns: 60 },
    );
  });

  // Each case grows and lays out a garden of up to 16 bees and flowers, slow under coverage.
  it(
    'property: in a garden of bees and flowers, as many scarecrows as lanterns guard every vine',
    {
      timeout: LAYOUT_PROPERTY_TIMEOUT,
    },
    () => {
      fc.assert(
        fc.property(fc.integer({ min: 4, max: 16 }), fc.nat(1000), (count, seed) => {
          const { design } = generate('beesFlowers', count, seed);
          const certified = certifySession(solved(sessionOf(design)), {
            stones: false,
            scarecrows: true,
          });
          expect(certified?.kind).toBe('certified');
          if (certified?.kind !== 'certified') return;
          const dusk = garden(certified.session);
          expect(checkVertexCover(dusk.graph, dusk.scarecrows).ok).toBe(true);
          expect(dusk.scarecrows).toHaveLength(size(dusk.matching));
          // Without the stones learnt, none is lifted.
          expect(dusk.stones).toEqual([]);
          expect(certified.stones).toBeNull();
        }),
        { numRuns: 40 },
      );
    },
  );

  it("property: from the player's own marks, it is refused or it closes", () => {
    const moves = fc.array(
      fc.tuple(
        fc.constantFrom('markRoot', 'markMoon', 'foldAt', 'fold', 'unfold', 'chain'),
        fc.array(fc.nat(15), { minLength: 1, maxLength: 5 }),
      ),
      { maxLength: 30 },
    );
    /** The action a player's numbers name. */
    const actionOf = (type: string, [u = 0, v = 0, ...rest]: number[]): Action =>
      type === 'markRoot'
        ? { type, vertex: u }
        : type === 'unfold'
          ? { type, blossom: u }
          : type === 'fold' || type === 'chain'
            ? type === 'fold'
              ? { type, loop: [u, v, ...rest] }
              : { type, path: [u, v, ...rest] }
            : { type: type === 'markMoon' ? 'markMoon' : 'foldAt', from: u, to: v };
    fc.assert(
      fc.property(designArb({ maxSprouts: 16 }), moves, (design, made) => {
        const played = toPlayable(design, ALL);
        fc.pre(played.ok);
        if (!played.ok) return;
        let session = openSession(played.value, 0).session;
        for (const [type, numbers] of made)
          session = act(session, actionOf(type, numbers), 0).session;
        const certified = certifySession(session, BOTH);
        if (certified?.kind !== 'certified') return;
        const dusk = garden(certified.session);
        expect(checkTutteBerge(dusk.graph, dusk.matching, dusk.stones).ok).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('offers no scarecrows in a garden with an odd loop', () => {
    const session = solved(sessionOf(TRIANGLE));
    const both = certifySession(session, BOTH);
    expect(both?.kind === 'certified' ? both.scarecrows : 'none').toBeNull();
    expect(certifySession(session, { stones: false, scarecrows: true })).toEqual({
      kind: 'refused',
      reason: 'notBees',
    });
  });

  it('says "not yet" before a search has ended without a chain', () => {
    expect(certifySession(sessionOf(TRIANGLE), BOTH)).toEqual({
      kind: 'refused',
      reason: 'notYet',
    });
    // Half a search is not over either.
    const started = act(sessionOf(TRIANGLE), { type: 'markRoot', vertex: 2 }, 0).session;
    expect(certifySession(started, BOTH)).toEqual({ kind: 'refused', reason: 'notYet' });
  });

  it('a garden where every sprout is lit needs no search and no stone', () => {
    const certified = certifySession(sessionOf(LIT_ROW), BOTH);
    expect(certified?.kind).toBe('certified');
    if (certified?.kind !== 'certified') return;
    expect(certified.stones).toEqual({ stones: 0, groups: 0, dark: 0 });
    expect(garden(certified.session).scarecrows).toHaveLength(2);
  });

  it('places them with tools lent: the player of 3.8 lifts no stone, yet keeps the rules', () => {
    const session = solved(sessionOf(LIT_ROW, actionsUnlockedBy('3.8')));
    const certified = certifySession(session, { stones: false, scarecrows: true });
    expect(certified?.kind).toBe('certified');
    if (certified?.kind !== 'certified') return;
    for (const state of certified.day.states) {
      expect(state.allowed).toBe(session.level.start.allowed);
    }
  });

  it('asked again, moves only what is not already in place', () => {
    const once = certifySession(solved(sessionOf(TRIANGLE)), BOTH);
    if (once?.kind !== 'certified') throw new Error('no certificate');
    const twice = certifySession(once.session, BOTH);
    if (twice?.kind !== 'certified') throw new Error('no certificate');
    expect(twice.day.states).toHaveLength(1);
    expect(garden(twice.session)).toBe(garden(once.session));
  });

  it('waits while the script holds the garden', () => {
    expect(certifySession(openSession(automatonLevel(), 0).session, BOTH)).toBeNull();
  });
});
