import { isMaximum } from '@core/edmonds/fast/maximum';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { ActionOutcome } from '@core/rules/outcome';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { hintContent, type HintContent } from './hintContent';
import {
  afterAccepted,
  afterRejected,
  isHintOffered,
  openHint,
  startHints,
  type HintState,
} from './hints';
import { current, push, redo, seek, startHistory, undo, type History } from './history';
import { nextMove } from './nextMove';
import { computeStars, type StarResult } from './stars';

/**
 * One play of a level: the history of its garden (undo, redo and the sun move its cursor), the
 * hint system, and what the playtest of Hito A measures (refusals, "Terminé" right and wrong,
 * water). Pure: the level scene keeps a session and replaces it after every event.
 */
export interface LevelSession {
  readonly level: Level;
  readonly history: History<GardenState>;
  readonly hints: HintState;
  readonly rejections: number;
  /** "Terminé" pressed with the most lanterns lit (right) or not (wrong: a claim without reason). */
  readonly claims: { readonly right: number; readonly wrong: number };
  /** Water spent inspecting in the whole session; undoing gives the fog back, not the water. */
  readonly waterSpent: number;
  /** Set the first time the level is won, with its stars. */
  readonly won: StarResult | null;
}

/** A session at the start of `level`, at time `now` (milliseconds). */
export const startSession = (level: Level, now: number): LevelSession => ({
  level,
  history: startHistory(level.start),
  hints: startHints(now),
  rejections: 0,
  claims: { right: 0, wrong: 0 },
  waterSpent: 0,
  won: null,
});

/** The garden shown now. */
export const garden = (session: LevelSession): GardenState => current(session.history);

/**
 * Tries a move. A refusal changes no garden: it is counted and its reason goes back to the view.
 * An accepted move is recorded in the history (dropping any undone future), counts as progress
 * for the hints, and may win the level, which is checked after every accepted move.
 */
export function act(
  session: LevelSession,
  action: Action,
  now: number,
): { session: LevelSession; outcome: ActionOutcome } {
  const before = garden(session);
  const outcome = applyAction(before, action);
  if (!outcome.ok) {
    return {
      session: {
        ...session,
        hints: afterRejected(session.hints),
        rejections: session.rejections + 1,
      },
      outcome,
    };
  }
  const after = outcome.state;
  const { level } = session;
  const claims =
    action.type !== 'declareDone'
      ? session.claims
      : isMaximum(after.graph, after.matching)
        ? { ...session.claims, right: session.claims.right + 1 }
        : { ...session.claims, wrong: session.claims.wrong + 1 };
  const waterSpent = session.waterSpent + Math.max(0, after.waterUsed - before.waterUsed);
  const won =
    session.won ??
    // Without a victory the garden never wins the level: its script ends it (plan 03, phase 2).
    (level.data.victory !== undefined && isVictory(after, level.data.victory)
      ? computeStars({
          hintsOpened: session.hints.opened,
          waterSpent,
          waterBudget: level.data.water,
        })
      : null);
  return {
    session: {
      ...session,
      history: push(session.history, after),
      hints: afterAccepted(session.hints, now),
      claims,
      waterSpent,
      won,
    },
    outcome,
  };
}

/** Undo, redo, and the sun: moves of the history cursor only. */
export const undoSession = (session: LevelSession): LevelSession => ({
  ...session,
  history: undo(session.history),
});
export const redoSession = (session: LevelSession): LevelSession => ({
  ...session,
  history: redo(session.history),
});
export const seekSession = (session: LevelSession, step: number): LevelSession => ({
  ...session,
  history: seek(session.history, step),
});

/** Whether a hint is on offer now (GDD §5.3). */
export const isHintAvailable = (session: LevelSession, now: number): boolean =>
  isHintOffered(session.hints, now);

/**
 * Opens the hint on offer: the next grade, with the level's own line and sprouts when it has them,
 * and at grade 3 the mentor's step for the garden as it is now. Null if no hint is on offer.
 */
export function askHint(
  session: LevelSession,
  now: number,
): { session: LevelSession; hint: HintContent } | null {
  const opened = openHint(session.hints, now);
  if (opened === null) return null;
  const { level } = session;
  const { victory } = level.data;
  // The mentor's step leads to the victory; a level without one has no step to give.
  const step =
    opened.grade >= 2 && victory !== undefined
      ? nextMove({ start: level.start, solution: level.solution, victory }, garden(session))
      : null;
  return {
    session: { ...session, hints: opened.hints },
    hint: hintContent(level.hints, opened.grade, step),
  };
}
