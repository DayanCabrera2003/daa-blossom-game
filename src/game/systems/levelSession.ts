import { isMaximum } from '@core/edmonds/fast/maximum';
import { matchedEdges } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import { invariant } from '@core/shared/invariant';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { TraceEvent } from '@core/trace/events';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import type { LevelStep } from '@levels/flow';
import { countAnswer, rightBet, rightVine } from './answerKey';
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
import { hintContent, type HintContent, type MentorReflection } from './hintContent';
import {
  afterAccepted,
  afterRejected,
  isHintOffered,
  openHint,
  startHints,
  type HintState,
} from './hints';
import { current, push, redo, seek, startHistory, undo, type History } from './history';
import {
  betterReflection,
  checkMirror,
  drawReflection,
  drawVine,
  startChallenge,
  type MirrorChallenge,
  type MirrorCheck,
} from './mirrorChallenge';
import { nextMove } from './nextMove';
import { winningPiece } from './pond';
import { hintedOption, questionAt } from './question';
import { reactionsTo, type FiredReaction } from './reactions';
import { NOT_NOW, type Refusal } from './refusal';
import { computeStars, type StarResult } from './stars';

/**
 * One play of a level: the history of its garden (undo, redo and the sun move its cursor), where
 * its script is, the hint system, and what the playtest of Hito A measures (refusals, "Terminé"
 * right and wrong, water). Pure: the level scene keeps a session and replaces it after every event.
 *
 * What is accepted depends on the step of the script (plan 03, phase 2): garden moves only while
 * playing, so the lanterns never change under a question that depends on them; undo, redo and the
 * sun while playing or waiting for the sun. The reflection of the mirror challenge is drawn and
 * checked only in its `draw` step. Once the script is over the garden is free again, as it
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
  /**
   * The reactions of play steps already fired. Kept apart from the history of the garden, so
   * undoing a move never lets its reaction fire again: each fires once in a play of the level.
   */
  readonly reactions: readonly FiredReaction[];
  /** The reflection drawn in the mirror challenge (2.4) and its checks; untouched elsewhere. */
  readonly challenge: MirrorChallenge;
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
  | { readonly type: 'tapSprout'; readonly vertex: VertexId }
  | { readonly type: 'pickVine'; readonly u: VertexId; readonly v: VertexId };

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
  // What the script needs of each notebook statement: right or not, the reply, and its garden.
  const notebook = (level.data.notebook?.options ?? []).map((option) => ({
    correct: option.correct,
    reply: option.reply ?? null,
    refuted: option.counterexample !== undefined,
  }));
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
    reactions: [],
    challenge: startChallenge(level.start.graph),
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
 * What the mentor says to an accepted move from `before` to `after`: the reactions of the play step
 * it fires, as one `say` effect, and the session that remembers they fired. No reactions outside a
 * play step: once the script is over, the garden no longer answers.
 */
function react(
  session: LevelSession,
  action: Action,
  before: GardenState,
  after: GardenState,
): { session: LevelSession; effects: FlowEffect[] } {
  const play = stepNow(session);
  if (play?.step !== 'play') return { session, effects: [] };
  const step = session.flow.index;
  const { reactions } = play;
  const turn = reactionsTo({ step, reactions }, session.reactions, { action, before, after });
  if (turn.lines.length === 0) return { session, effects: [] };
  return {
    session: { ...session, reactions: turn.fired },
    effects: [{ kind: 'say', lines: turn.lines }],
  };
}

/**
 * Tries a move. Outside the play step it is refused with `notNow`, which is no mistake: it neither
 * counts as a refusal nor brings a hint closer. A refusal of the rules changes no garden: it is
 * counted and its reason goes back to the view. An accepted move is recorded in the history
 * (dropping any undone future) and counts as progress for the hints; while playing, the mentor may
 * react to it, and it may win the play step, which is checked after every accepted move. What the
 * mentor says to the move comes before whatever winning brings.
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
  const reacted = react(session, action, before, after);
  const moved: LevelSession = {
    ...reacted.session,
    history: push(session.history, after),
    hints: afterAccepted(session.hints, now),
    claims,
    waterSpent,
  };
  // The victory belongs to the play step: integrity requires one exactly when there is a play step.
  const { victory } = session.level.data;
  const won =
    stepNow(session)?.step === 'play' && victory !== undefined && isVictory(after, victory);
  if (!won) return { session: moved, outcome, effects: reacted.effects };
  const advanced = advance(moved, { type: 'won' }, now);
  return { session: advanced.session, outcome, effects: [...reacted.effects, ...advanced.effects] };
}

/**
 * Gives the script an answer, a bet, a touch or news of the sun. The right number of a bet or a
 * count, and whether a vine pointed at is the conflict, come from the core, judged on the garden as
 * it is now; a step that does not wait for this
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
      const right = step?.step === 'count' ? countAnswer(level, garden(session), step) : null;
      return advance(session, { type: 'answer', option: input.option, right }, now);
    }
    case 'bet':
      return advance(session, { type: 'bet', value: input.value, right: rightBet(level) }, now);
    case 'pickVine': {
      const right = rightVine(garden(session), input.u, input.v);
      return advance(session, { ...input, right }, now);
    }
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
  const question = questionAt(level, session.flow.index, garden(session));
  const option = question === null ? null : hintedOption(question);
  // In the mirror challenge, the mentor offers a better reflection, and at grade 3 draws it.
  const offer = current.step === 'draw' && opened.grade >= 2 ? mentorOffer(session) : null;
  const hint = hintContent(level.hints, opened.grade, step, option, offer?.reflection ?? null);
  const { challenge } = session;
  return {
    session: {
      ...session,
      hints: opened.hints,
      challenge:
        offer !== null && hint.mirror !== null
          ? drawReflection(challenge, offer.better)
          : challenge,
    },
    hint,
  };
}

/**
 * The better reflection the mentor offers in the mirror challenge: your lanterns turned over along
 * a chain the core finds, with that chain. Null when your garden is already the best, which level
 * integrity keeps out of a mirror challenge.
 */
function mentorOffer(
  session: LevelSession,
): { readonly better: Matching; readonly reflection: MentorReflection } | null {
  const yours = garden(session).matching;
  const better = betterReflection(session.level.start.graph, yours);
  if (better === null) return null;
  const piece = winningPiece(yours, better);
  invariant(piece !== null, 'a better reflection wins on some thread (Berge)');
  return { better, reflection: { lanterns: matchedEdges(better), chain: piece.sprouts } };
}

/**
 * A touch on the vine u–v of the reflection drawn in the mirror challenge: drawn or taken out, or
 * refused (a sprout would hold two silver lanterns). Outside the `draw` step it is refused with
 * `notNow`, like a move under a question.
 */
export function drawInMirror(
  session: LevelSession,
  u: VertexId,
  v: VertexId,
): { session: LevelSession; refusal: Refusal | null } {
  if (stepNow(session)?.step !== 'draw') return { session, refusal: NOT_NOW };
  const drawn = drawVine(session.challenge, session.level.start.graph, u, v);
  return drawn.ok
    ? { session: { ...session, challenge: drawn.value }, refusal: null }
    : { session, refusal: drawn.error };
}

/**
 * Checks the drawn reflection against your lanterns, in the `draw` step only (elsewhere nothing
 * happens and the check is null). A better reflection not checked before is one more attempt; once
 * the checks that do not win reach the limit, the step is over anyway.
 */
export function checkDrawnMirror(
  session: LevelSession,
  now: number,
): { session: LevelSession; check: MirrorCheck | null; effects: FlowEffect[] } {
  if (stepNow(session)?.step !== 'draw') return { session, check: null, effects: [] };
  const { challenge, check } = checkMirror(session.challenge, garden(session).matching);
  const signal: FlowSignal =
    check.kind === 'better'
      ? { type: 'mirrorChecked', better: check.fresh }
      : check.spared
        ? { type: 'mirrorSpared' }
        : { type: 'mirrorChecked', better: false };
  const advanced = advance({ ...session, challenge }, signal, now);
  return { ...advanced, check };
}
