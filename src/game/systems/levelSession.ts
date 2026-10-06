import { isMaximum } from '@core/edmonds/fast/maximum';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { TraceEvent } from '@core/trace/events';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import type { LevelStep } from '@levels/flow';
import { rightBet, rightCount } from './answerKey';
import {
  advanceFlow,
  betRight,
  currentStep,
  isFinished,
  startFlow,
  type FlowEffect,
  type FlowSignal,
  type FlowState,
} from './flow';
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
import { hintedOption, questionAt } from './question';
import { NOT_NOW, type Refusal } from './refusal';
import { computeStars, type StarResult } from './stars';

/**
 * One play of a level: the history of its garden (undo, redo and the sun move its cursor), where
 * its script is, the hint system, and what the playtest of Hito A measures (refusals, "Terminé"
 * right and wrong, water). Pure: the level scene keeps a session and replaces it after every event.
 *
 * What is accepted depends on the step of the script (plan 03, phase 2): garden moves only while
 * playing, so the lanterns never change under a question that depends on them; undo, redo and the
 * sun while playing or waiting for the sun. Once the script is over the garden is free again, as it
 * always was after a win, but nothing more can be won.
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
  /** Set when the script finishes (with the default script, when the level is won), with its stars. */
  readonly won: StarResult | null;
  readonly flow: FlowState;
}

/** The answer of a move: applied (for the animation queue), or refused and why. */
export type MoveOutcome =
  | { readonly ok: true; readonly state: GardenState; readonly events: readonly TraceEvent[] }
  | { readonly ok: false; readonly reason: Refusal };

/** What the player gives the script besides garden moves. */
export type ScriptInput =
  | { readonly type: 'answer'; readonly option: number }
  | { readonly type: 'bet'; readonly value: number }
  | { readonly type: 'sunMoved' }
  | { readonly type: 'tap' }
  | { readonly type: 'tapSprout'; readonly vertex: VertexId };

/** The steps in which a hint may be offered (never while the day replays, nor in plain waits). */
const HINT_STEPS: ReadonlySet<LevelStep['step']> = new Set(['play', 'ask', 'count', 'draw']);

/** The step of the script now, or null once it is over. */
export const stepNow = (session: LevelSession): LevelStep | null => currentStep(session.flow);

/** Whether garden moves are taken now: while playing, or once the script is over. */
const takesMoves = (session: LevelSession): boolean => {
  const step = stepNow(session);
  return step === null || step.step === 'play';
};

/** Whether undo, redo and the sun are taken now: while moves are, and while waiting for the sun. */
const takesHistory = (session: LevelSession): boolean =>
  takesMoves(session) || stepNow(session)?.step === 'sun';

/**
 * The stars, fixed the moment the script is over: they count the hints opened in the whole level,
 * the water spent and the bet. Once fixed, they never change.
 */
const starsAt = (session: LevelSession, flow: FlowState): StarResult | null =>
  session.won ??
  (isFinished(flow)
    ? computeStars({
        hintsOpened: session.hints.opened,
        waterSpent: session.waterSpent,
        waterBudget: session.level.data.water,
        betRight: betRight(flow),
      })
    : null);

/** Feeds a signal to the script; a step that begins restarts the wait for a hint. */
function advance(
  session: LevelSession,
  signal: FlowSignal,
  now: number,
): { session: LevelSession; effects: FlowEffect[] } {
  const { flow, effects } = advanceFlow(session.flow, signal);
  if (flow.index === session.flow.index) return { session: { ...session, flow }, effects };
  const hints = afterAccepted(session.hints, now);
  return { session: { ...session, flow, hints, won: starsAt(session, flow) }, effects };
}

/** A session at the start of `level`, at time `now` (milliseconds), with what its script opens with. */
export function openSession(
  level: Level,
  now: number,
): { session: LevelSession; effects: FlowEffect[] } {
  const notebook = level.data.notebook?.options.map((option) => option.correct) ?? [];
  const { flow, effects } = startFlow(level.flow, { notebook });
  const session: LevelSession = {
    level,
    history: startHistory(level.start),
    hints: startHints(now),
    rejections: 0,
    claims: { right: 0, wrong: 0 },
    waterSpent: 0,
    won: null,
    flow,
  };
  // A script that is over at once (only lines) completes the level as it opens.
  return { session: { ...session, won: starsAt(session, flow) }, effects };
}

/** A session at the start of `level`, at time `now` (milliseconds). */
export const startSession = (level: Level, now: number): LevelSession =>
  openSession(level, now).session;

/** The garden shown now. */
export const garden = (session: LevelSession): GardenState => current(session.history);

/**
 * Tries a move. Outside the play step it is refused with `notNow`, which is no mistake: it neither
 * counts as a refusal nor brings a hint closer. A refusal of the rules changes no garden: it is
 * counted and its reason goes back to the view. An accepted move is recorded in the history
 * (dropping any undone future) and counts as progress for the hints; while playing, it may win the
 * play step, which is checked after every accepted move.
 */
export function act(
  session: LevelSession,
  action: Action,
  now: number,
): { session: LevelSession; outcome: MoveOutcome; effects: FlowEffect[] } {
  if (!takesMoves(session)) {
    return { session, outcome: { ok: false, reason: NOT_NOW }, effects: [] };
  }
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
      effects: [],
    };
  }
  const after = outcome.state;
  const claims =
    action.type !== 'declareDone'
      ? session.claims
      : isMaximum(after.graph, after.matching)
        ? { ...session.claims, right: session.claims.right + 1 }
        : { ...session.claims, wrong: session.claims.wrong + 1 };
  const waterSpent = session.waterSpent + Math.max(0, after.waterUsed - before.waterUsed);
  const moved: LevelSession = {
    ...session,
    history: push(session.history, after),
    hints: afterAccepted(session.hints, now),
    claims,
    waterSpent,
  };
  // The victory belongs to the play step: integrity requires one exactly when there is a play step.
  const { victory } = session.level.data;
  const won =
    stepNow(session)?.step === 'play' && victory !== undefined && isVictory(after, victory);
  if (!won) return { session: moved, outcome, effects: [] };
  return { ...advance(moved, { type: 'won' }, now), outcome };
}

/**
 * Gives the script an answer, a bet, a touch or news of the sun. The right number of a bet or a
 * count comes from the core, judged on the garden as it is now; a step that does not wait for this
 * input ignores it.
 */
export function respond(
  session: LevelSession,
  input: ScriptInput,
  now: number,
): { session: LevelSession; effects: FlowEffect[] } {
  const { level } = session;
  switch (input.type) {
    case 'answer': {
      const step = stepNow(session);
      const right =
        step?.step === 'count' && level.mirror !== null
          ? rightCount(garden(session).matching, level.mirror, step)
          : null;
      return advance(session, { type: 'answer', option: input.option, right }, now);
    }
    case 'bet':
      return advance(session, { type: 'bet', value: input.value, right: rightBet(level) }, now);
    default:
      return advance(session, input, now);
  }
}

/**
 * Undo, redo, and the sun: moves of the history cursor only, taken while playing or waiting for the
 * sun; in any other step the session comes back as it was.
 */
export const undoSession = (session: LevelSession): LevelSession =>
  takesHistory(session) ? { ...session, history: undo(session.history) } : session;
export const redoSession = (session: LevelSession): LevelSession =>
  takesHistory(session) ? { ...session, history: redo(session.history) } : session;
export const seekSession = (session: LevelSession, step: number): LevelSession =>
  takesHistory(session) ? { ...session, history: seek(session.history, step) } : session;

/** Whether a hint is on offer now (GDD §5.3): only in the steps that offer them. */
export function isHintAvailable(session: LevelSession, now: number): boolean {
  const step = stepNow(session);
  return step !== null && HINT_STEPS.has(step.step) && isHintOffered(session.hints, now);
}

/**
 * Opens the hint on offer: the next grade, with the level's own line and sprouts when it has them,
 * and at grade 3 the mentor's step for the garden as it is now, or under a question the right
 * option. Null if no hint is on offer.
 */
export function askHint(
  session: LevelSession,
  now: number,
): { session: LevelSession; hint: HintContent } | null {
  const current = stepNow(session);
  if (current === null || !HINT_STEPS.has(current.step)) return null;
  const opened = openHint(session.hints, now);
  if (opened === null) return null;
  const { level } = session;
  const { victory } = level.data;
  // The mentor's step leads to the victory of the play step; other steps have no move to give.
  const step =
    opened.grade >= 2 && current.step === 'play' && victory !== undefined
      ? nextMove({ start: level.start, solution: level.solution, victory }, garden(session))
      : null;
  // Under a question, the mentor points at a right option instead (never at a bet's).
  const question = questionAt(level, session.flow.index, garden(session).matching);
  const option = question === null ? null : hintedOption(question);
  return {
    session: { ...session, hints: opened.hints },
    hint: hintContent(level.hints, opened.grade, step, option),
  };
}
