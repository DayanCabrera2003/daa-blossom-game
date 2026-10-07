import { runPhase } from '@core/edmonds/phase';
import type { Graph, VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import { invariant } from '@core/shared/invariant';
import type { Result } from '@core/shared/result';
import { drawnPairs, emptyDraft, toggleDraft, type DraftRefusal } from '../input/mirrorDraft';
import { pondPieces, type Piece } from './pond';

/**
 * The mirror challenge (GDD 2.4, plan 03 phase 8): the player is the reflection and draws a set of
 * lanterns that beats the garden without leaving it a chain. Each check overlays the drawing on the
 * garden: one with no more lanterns than yours does not beat you ("ese no te gana") and is no
 * attempt; a better one always leaves a thread where the reflection wins, and that thread is a
 * chain of your garden (Berge's lemma), which the core's decomposition finds. Pure.
 *
 * Nobody is left stuck: a grade-3 hint draws a better reflection (your lanterns turned over along a
 * chain the core finds), and after `MISSES_BEFORE_SPARED` checks that do not win, the step is over
 * anyway, with a word from the mentor.
 */

/** Checks that do not beat the garden before the step is over anyway. */
export const MISSES_BEFORE_SPARED = 6;

/** What a check found. */
export type MirrorCheck =
  /** The drawing holds no more lanterns than yours; `spared` on the check that ends the wait. */
  | {
      readonly kind: 'notBetter';
      readonly drawn: number;
      readonly yours: number;
      readonly spared: boolean;
    }
  /**
   * The drawing beats yours: the pieces of the tangle, and the first one where the reflection wins,
   * a chain of your garden. `fresh` unless this very reflection was already checked, which then
   * counts as no new attempt.
   */
  | {
      readonly kind: 'better';
      readonly pieces: readonly Piece[];
      readonly piece: Piece;
      readonly fresh: boolean;
    };

/** Everything the challenge remembers. */
export interface MirrorChallenge {
  /** The reflection drawn so far (silver lanterns). */
  readonly draft: Matching;
  /** Checks so far that did not beat the garden. */
  readonly misses: number;
  /** The better reflections already checked, each as the key of its lanterns. */
  readonly checked: readonly string[];
  /** The last check, shown until the drawing changes; null while drawing. */
  readonly shown: MirrorCheck | null;
}

/** A challenge on `graph` with nothing drawn yet. */
export const startChallenge = (graph: Graph): MirrorChallenge => ({
  draft: emptyDraft(graph),
  misses: 0,
  checked: [],
  shown: null,
});

/** A touch on the vine u–v of the drawing; a change of the drawing puts the last check away. */
export function drawVine(
  challenge: MirrorChallenge,
  graph: Graph,
  u: VertexId,
  v: VertexId,
): Result<MirrorChallenge, DraftRefusal> {
  const toggled = toggleDraft(graph, challenge.draft, u, v);
  return toggled.ok ? { ok: true, value: drawReflection(challenge, toggled.value) } : toggled;
}

/** A whole reflection drawn at once (a hint draws one), in place of the drawing. */
export const drawReflection = (challenge: MirrorChallenge, draft: Matching): MirrorChallenge => ({
  ...challenge,
  draft,
  shown: null,
});

/** The same lanterns read the same, however they were drawn. */
const keyOf = (draft: Matching): string => JSON.stringify(drawnPairs(draft));

/** Checks the drawing against your lanterns `yours`; the check stays shown until the next touch. */
export function checkMirror(
  challenge: MirrorChallenge,
  yours: Matching,
): { challenge: MirrorChallenge; check: MirrorCheck } {
  const drawn = size(challenge.draft);
  if (drawn <= size(yours)) {
    const misses = challenge.misses + 1;
    const check: MirrorCheck = {
      kind: 'notBetter',
      drawn,
      yours: size(yours),
      spared: misses === MISSES_BEFORE_SPARED,
    };
    return { challenge: { ...challenge, misses, shown: check }, check };
  }
  const pieces = pondPieces(yours, challenge.draft);
  const piece = pieces.find((candidate) => candidate.gain > 0);
  invariant(piece !== undefined, 'a larger reflection always wins on some thread (Berge)');
  const key = keyOf(challenge.draft);
  const fresh = !challenge.checked.includes(key);
  const check: MirrorCheck = { kind: 'better', pieces, piece, fresh };
  const checked = fresh ? [...challenge.checked, key] : challenge.checked;
  return { challenge: { ...challenge, checked, shown: check }, check };
}

/**
 * A reflection that beats `yours`: your lanterns turned over along the chain one phase of the core
 * finds; null when none can, because your garden is already the best.
 */
export function betterReflection(graph: Graph, yours: Matching): Matching | null {
  const phase = runPhase(graph, yours);
  return phase.kind === 'augmented' ? phase.matching : null;
}
