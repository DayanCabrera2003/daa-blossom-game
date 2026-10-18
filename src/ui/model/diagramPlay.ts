import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { DiagramGarden } from './diagramGarden';
import type { DiagramMove } from './diagramSpec';
import { chainOf, touchDiagram, type DiagramTarget } from './diagramTouch';

/**
 * A garden the reader plays on in the Codex (plan 07, phase 4): "the same engine, small". Every
 * move is asked of `applyAction` on a garden that allows only the block's moves; an accepted one
 * adds the new garden to the day, a refused one keeps the reason for the page's gentle text. The
 * day can be undone move by move or started again; nothing here draws.
 */

/** A move the rules refused, and why. */
export interface PlayRefusal {
  readonly reason: RejectReason;
  readonly action: Action;
}

/** A garden being played. */
export interface PlaySession {
  /** The moves this garden allows. */
  readonly moves: ReadonlySet<DiagramMove>;
  /** The day so far: the start first, the garden now last. */
  readonly history: readonly GardenState[];
  /** The sprouts touched toward the next move: a pair's first, or a chain being drawn. */
  readonly touched: readonly VertexId[];
  /** The last move refused, until the next touch. */
  readonly refusal: PlayRefusal | null;
}

/** A new day on `garden`, which allows only `moves`. */
export function startPlay(garden: DiagramGarden, moves: readonly DiagramMove[]): PlaySession {
  return {
    moves: new Set(moves),
    history: [{ ...garden.start, allowed: new Set(moves) }],
    touched: [],
    refusal: null,
  };
}

/** The garden as it is now. */
export const currentGarden = (session: PlaySession): GardenState =>
  itemAt(session.history, session.history.length - 1);

/** How many lanterns are lit now. */
export const lanternCount = (session: PlaySession): number => size(currentGarden(session).matching);

/** Asks the rules for `action`; `touched` is what stays touched if they refuse it. */
function play(session: PlaySession, action: Action, touched: readonly VertexId[]): PlaySession {
  const outcome = applyAction(currentGarden(session), action);
  if (!outcome.ok) return { ...session, touched, refusal: { reason: outcome.reason, action } };
  return { ...session, history: [...session.history, outcome.state], touched: [], refusal: null };
}

/** A touch on `target`: a sprout held or added to the chain, or a move asked of the rules. */
export function touchPlay(session: PlaySession, target: DiagramTarget): PlaySession {
  const outcome = touchDiagram(currentGarden(session), session.moves, session.touched, target);
  if (outcome.action === null) return { ...session, touched: outcome.touched, refusal: null };
  return play(session, outcome.action, outcome.touched);
}

/** Passes the chain drawn; a refused one stays drawn, to be mended. Nothing without a chain. */
export function passChain(session: PlaySession): PlaySession {
  const chain = chainOf(session.touched, session.moves);
  return chain === null ? session : play(session, chain, session.touched);
}

/** Takes back the last move (nothing before the first), and lets go of what was touched. */
export const undoPlay = (session: PlaySession): PlaySession => ({
  ...session,
  history: session.history.length > 1 ? session.history.slice(0, -1) : session.history,
  touched: [],
  refusal: null,
});

/** Starts the day again. */
export const resetPlay = (session: PlaySession): PlaySession => ({
  ...session,
  history: session.history.slice(0, 1),
  touched: [],
  refusal: null,
});
