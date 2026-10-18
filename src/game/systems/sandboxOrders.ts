import { size } from '@core/matching/queries';
import type { SandboxAccess } from '@services/sandboxAccess';
import type { FreeOrders, OrderAnswer, OrderWords } from './levelController';
import { garden, type LevelSession } from './levelSession';
import { certifySession, type Certified } from './sandboxCertificate';
import { solveSession } from './sandboxSolve';

/**
 * The free mode's orders on a garden being played (plan 08, phase 13), as the player has met them
 * (`services/sandboxAccess.ts`): the mechanical gardener after 6.2, the certificate after 3.8 (the
 * scarecrows) or 7.4 (the stones). Each answer says, in garden words, what the order did: the
 * mentor counts the gardener's lanterns and points at the sun; the Council of chapter 7 reads its
 * count off the stones; the mentor tells why the scarecrows are enough. Built in the free mode's
 * chunk and handed to the level screen with the garden.
 */

/**
 * The longest the gardener's run takes to show, in milliseconds: a run of hundreds of moves (24
 * sprouts) steps faster to fit it, and the sun then walks it at the player's own pace.
 */
export const GARDENER_REPLAY_MS = 12_000;

/** What the mentor says once the gardener's run is shown. */
const solvedWords = (session: LevelSession): OrderWords => ({
  key: 'sandbox.solve.done',
  params: { count: size(garden(session).matching) },
  speaker: 'sauce',
});

/**
 * What is said of a certificate placed: the Council's count of the stones (or, with every sprout
 * lit, that no stone is needed), then the mentor on the scarecrows.
 */
function certifiedWords(certified: Extract<Certified, { kind: 'certified' }>): OrderWords[] {
  const words: OrderWords[] = [];
  const { stones, scarecrows } = certified;
  if (stones !== null) {
    words.push(
      stones.dark === 0
        ? { key: 'sandbox.certify.stonesFull', params: {}, speaker: 'oaks' }
        : { key: 'sandbox.certify.stones', params: { ...stones }, speaker: 'oaks' },
    );
  }
  if (scarecrows !== null) {
    words.push({
      key: 'sandbox.certify.scarecrows',
      params: { count: scarecrows },
      speaker: 'sauce',
    });
  }
  return words;
}

/** The free mode's orders for a player `access` describes; null where not met yet. */
export function freeOrders(access: SandboxAccess): FreeOrders {
  const { gardener, stones, scarecrows } = access;
  const solve = (session: LevelSession): OrderAnswer | null => {
    const solved = solveSession(session);
    if (solved === null) return null;
    return {
      kind: 'done',
      session: solved.session,
      day: solved.day.states,
      within: GARDENER_REPLAY_MS,
      lines: [solvedWords(solved.session)],
    };
  };
  const certify = (session: LevelSession): OrderAnswer | null => {
    const certified = certifySession(session, { stones, scarecrows });
    if (certified === null) return null;
    if (certified.kind === 'refused') {
      // Not yet: the way to a finished search, which the gardener can make once he is met.
      const key =
        certified.reason === 'notBees'
          ? 'sandbox.certify.notBees'
          : gardener
            ? 'sandbox.certify.notYetGardener'
            : 'sandbox.certify.notYet';
      return { kind: 'refused', toast: { key, params: {} } };
    }
    return {
      kind: 'done',
      session: certified.session,
      day: certified.day.states,
      within: null,
      lines: certifiedWords(certified),
    };
  };
  return {
    solve: gardener ? solve : null,
    certify: stones || scarecrows ? certify : null,
  };
}
