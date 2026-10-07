import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import type { LevelStep } from '@levels/flow';

/**
 * The script engine (plan 03, phase 2): runs the steps of a level's script, in order, one signal at
 * a time. Pure and data only: it never looks at the garden. Whatever the core has to say about the
 * garden (the level was won, the right number of a bet or a count) arrives inside the signal, and
 * whatever the scene has to show leaves as effects. Steps that finish at once (say, replay, mirror)
 * chain within the same call; a step never repeats once passed.
 */

/** An answer given to a question of the script: the option or number, and whether it was right. */
export interface FlowAnswer {
  /** The index of the step that asked, in the script. */
  readonly step: number;
  readonly value: number;
  readonly correct: boolean;
}

/** What the engine is told; each step listens to one kind and ignores the rest. */
export type FlowSignal =
  /** The core says the victory of the level holds (ends `play`). */
  | { readonly type: 'won' }
  /**
   * An option of an `ask` or `notebook`, or a number in a `count`; `right` is the number the core
   * gives for a count (null for the other two, which are judged by their options).
   */
  | { readonly type: 'answer'; readonly option: number; readonly right: number | null }
  /** A bet, and the most lanterns the garden can hold, as the core computes it. */
  | { readonly type: 'bet'; readonly value: number; readonly right: number }
  /** The sun moved through the day (undo, redo or the slider changed the shown state). */
  | { readonly type: 'sunMoved' }
  /** A touch on the garden. */
  | { readonly type: 'tap' }
  /** A touch on a sprout. */
  | { readonly type: 'tapSprout'; readonly vertex: VertexId }
  /** A touch on the vine u–v; `right` when the core says it is the conflict of the search. */
  | {
      readonly type: 'pickVine';
      readonly u: VertexId;
      readonly v: VertexId;
      readonly right: boolean;
    }
  /** A drawn reflection was checked; `better` when it beats the player's garden. */
  | { readonly type: 'mirrorChecked'; readonly better: boolean }
  /** Too many checks did not win: the mirror challenge is over anyway (no one stays stuck). */
  | { readonly type: 'mirrorSpared' };

/** What the scene has to show; data only, line ids untranslated. */
export type FlowEffect =
  /** The play step begins: the garden takes moves. */
  | { readonly kind: 'play' }
  | { readonly kind: 'say'; readonly lines: readonly string[] }
  | {
      readonly kind: 'ask';
      readonly step: number;
      readonly prompt: string;
      readonly options: readonly string[];
    }
  /** An answer or a bet was given; for the playtest log and the question panel. */
  | {
      readonly kind: 'answered';
      readonly step: number;
      readonly value: number;
      readonly correct: boolean;
    }
  | {
      readonly kind: 'bet';
      readonly step: number;
      readonly prompt: string;
      readonly range: number;
      /** Milliseconds the garden is shown before it is veiled; null when it stays in view. */
      readonly preview: number | null;
      readonly informal: boolean;
    }
  /** The play step was won after a bet: the mentor tells the bet against the real value. */
  | { readonly kind: 'reveal'; readonly bet: number; readonly right: number }
  /** Waiting for the player to move the sun. */
  | { readonly kind: 'sun' }
  /** The day replays itself: the player's own, or the demo moves from the start of the level. */
  | { readonly kind: 'replay'; readonly demo: readonly Action[] | null }
  | { readonly kind: 'mirror' }
  /** Waiting for a touch on a sprout, which shows its threads in the tangle. */
  | { readonly kind: 'explore' }
  | { readonly kind: 'sproutTapped'; readonly vertex: VertexId }
  /** Waiting for a touch that splits the tangle. */
  | { readonly kind: 'separate' }
  /** A count; what is counted, and its right number, come from the level and the core. */
  | {
      readonly kind: 'count';
      readonly step: number;
      readonly prompt: string;
      readonly range: number;
    }
  | { readonly kind: 'draw'; readonly attempts: number }
  /** Waiting for a touch on the vine where the light went wrong. */
  | { readonly kind: 'pickVine'; readonly step: number; readonly prompt: string }
  /** A vine was pointed at; for the playtest log and the split badge. */
  | {
      readonly kind: 'vinePicked';
      readonly step: number;
      readonly u: VertexId;
      readonly v: VertexId;
      readonly correct: boolean;
    }
  /** The notebook question of the level, opened (again, after a false statement). */
  | { readonly kind: 'notebook'; readonly step: number }
  /** A false statement of the notebook (`option`) is refuted by its garden, which opens. */
  | { readonly kind: 'counterexample'; readonly step: number; readonly option: number }
  /** The right statement was chosen: it is written in the player's notebook. */
  | { readonly kind: 'written' }
  /** The last step is over: the level is complete. */
  | { readonly kind: 'finished' };

/** What the engine needs of one notebook statement. */
export interface NotebookKey {
  readonly correct: boolean;
  /** What the mentor says when it is chosen, or null. */
  readonly reply: string | null;
  /** Whether a counterexample garden refutes it. */
  readonly refuted: boolean;
}

/** Where a script is, and what the player has given it so far. */
export interface FlowState {
  readonly steps: readonly LevelStep[];
  /** The statements of the level's notebook question, in order (empty without one). */
  readonly notebook: readonly NotebookKey[];
  /** The index of the current step; equal to the number of steps once the script is finished. */
  readonly index: number;
  /** Every answer and bet, in the order given. */
  readonly answers: readonly FlowAnswer[];
  /**
   * The bet placed, if any, and the right value the core gave for it; an informal bet is kept but
   * earns nothing.
   */
  readonly bet: {
    readonly value: number;
    readonly right: number;
    readonly correct: boolean;
    readonly informal: boolean;
  } | null;
  /** Better reflections checked in the current `draw` step. */
  readonly attempts: number;
  /** The sprout touched to explore the tangle (2.1), whose strands stay shown; null before. */
  readonly touched: VertexId | null;
}

/** One turn of the engine: the script after a signal, and what to show for it. */
export type FlowTurn = { flow: FlowState; effects: FlowEffect[] };

/** The step being played, or null once the script is finished. */
export const currentStep = (flow: FlowState): LevelStep | null => flow.steps[flow.index] ?? null;

/** Whether every step of the script is over. */
export const isFinished = (flow: FlowState): boolean => flow.index >= flow.steps.length;

/** Whether a step of this kind is behind: before the current step, or anywhere once it is over. */
export const isPast = (flow: FlowState, kind: LevelStep['step']): boolean =>
  flow.steps.slice(0, flow.index).some((step) => step.step === kind);

/** Whether a formal bet was right; null without a bet, or with an informal one (GDD §5.4). */
export const betRight = (flow: FlowState): boolean | null =>
  flow.bet === null || flow.bet.informal ? null : flow.bet.correct;

/** The effect that opens a step: what the scene shows, or what it waits for. */
function opening(step: LevelStep, index: number): FlowEffect {
  switch (step.step) {
    case 'play':
      return { kind: 'play' };
    case 'say':
      return { kind: 'say', lines: step.lines };
    case 'ask':
      return {
        kind: 'ask',
        step: index,
        prompt: step.prompt,
        options: step.options.map((option) => option.line),
      };
    case 'bet':
      return {
        kind: 'bet',
        step: index,
        prompt: step.prompt,
        range: step.range,
        preview: step.preview ?? null,
        informal: step.informal,
      };
    case 'sun':
      return { kind: 'sun' };
    case 'replay':
      return { kind: 'replay', demo: step.demo ?? null };
    case 'mirror':
      return { kind: 'mirror' };
    case 'explore':
      return { kind: 'explore' };
    case 'separate':
      return { kind: 'separate' };
    case 'count':
      return { kind: 'count', step: index, prompt: step.prompt, range: step.range };
    case 'draw':
      return { kind: 'draw', attempts: step.attempts };
    case 'notebook':
      return { kind: 'notebook', step: index };
    case 'pickVine':
      return { kind: 'pickVine', step: index, prompt: step.prompt };
  }
}

/** Steps that are over as soon as they are shown: the scene plays them out on its own. */
const AT_ONCE: ReadonlySet<LevelStep['step']> = new Set(['say', 'replay', 'mirror']);

/**
 * Opens the step at `index` and every step after it that finishes at once, until one waits for the
 * player or the script ends.
 */
function enter(flow: FlowState, index: number, effects: FlowEffect[]): FlowTurn {
  let at = index;
  for (;;) {
    const step = flow.steps[at];
    if (step === undefined) {
      effects.push({ kind: 'finished' });
      return { flow: { ...flow, index: at, attempts: 0 }, effects };
    }
    effects.push(opening(step, at));
    if (!AT_ONCE.has(step.step)) return { flow: { ...flow, index: at, attempts: 0 }, effects };
    at++;
  }
}

/** The script at its start: the effects of its first steps, up to the first one that waits. */
export function startFlow(
  steps: readonly LevelStep[],
  key: { readonly notebook: readonly NotebookKey[] },
): FlowTurn {
  const flow: FlowState = {
    steps,
    notebook: key.notebook,
    index: 0,
    answers: [],
    bet: null,
    attempts: 0,
    touched: null,
  };
  return enter(flow, 0, []);
}

/** Records an answer to the current step, with the effect that reports it. */
function answered(flow: FlowState, value: number, correct: boolean): FlowTurn {
  const answer = { step: flow.index, value, correct };
  return {
    flow: { ...flow, answers: [...flow.answers, answer] },
    effects: [{ kind: 'answered', ...answer }],
  };
}

/** Feeds one signal to the current step. A signal the step does not wait for changes nothing. */
export function advanceFlow(flow: FlowState, signal: FlowSignal): FlowTurn {
  const step = currentStep(flow);
  const unchanged: FlowTurn = { flow, effects: [] };
  if (step === null) return unchanged;
  const next = (from: FlowTurn): FlowTurn => enter(from.flow, flow.index + 1, from.effects);

  switch (step.step) {
    case 'play': {
      if (signal.type !== 'won') return unchanged;
      // The goal stays hidden after a bet until the win; then the mentor tells the real value.
      const { bet } = flow;
      const reveal: FlowEffect[] =
        bet === null ? [] : [{ kind: 'reveal', bet: bet.value, right: bet.right }];
      return enter(flow, flow.index + 1, reveal);
    }
    case 'sun':
      return signal.type === 'sunMoved' ? enter(flow, flow.index + 1, []) : unchanged;
    case 'separate':
      return signal.type === 'tap' ? enter(flow, flow.index + 1, []) : unchanged;
    case 'explore':
      return signal.type === 'tapSprout'
        ? enter({ ...flow, touched: signal.vertex }, flow.index + 1, [
            { kind: 'sproutTapped', vertex: signal.vertex },
          ])
        : unchanged;
    case 'ask': {
      if (signal.type !== 'answer') return unchanged;
      const option = step.options[signal.option];
      if (option === undefined) return unchanged;
      const given = answered(flow, signal.option, option.correct);
      if (option.reply !== undefined) given.effects.push({ kind: 'say', lines: [option.reply] });
      if (option.correct || !step.retry) return next(given);
      given.effects.push(opening(step, flow.index));
      return given;
    }
    case 'count': {
      if (signal.type !== 'answer' || signal.right === null) return unchanged;
      const given = answered(flow, signal.option, signal.option === signal.right);
      if (signal.option === signal.right) return next(given);
      given.effects.push(opening(step, flow.index));
      return given;
    }
    case 'pickVine': {
      // Only the conflict ends the step; any other vine hears the reply, if any, and is asked again.
      if (signal.type !== 'pickVine') return unchanged;
      const { u, v, right } = signal;
      const picked: FlowTurn = {
        flow,
        effects: [{ kind: 'vinePicked', step: flow.index, u, v, correct: right }],
      };
      if (right) return next(picked);
      if (step.reply !== undefined) picked.effects.push({ kind: 'say', lines: [step.reply] });
      picked.effects.push(opening(step, flow.index));
      return picked;
    }
    case 'notebook': {
      // A false statement is answered by the mentor and refuted by its garden, if it has them;
      // then the question opens again. Only the right one is written down and ends the step.
      if (signal.type !== 'answer') return unchanged;
      const statement = flow.notebook[signal.option];
      if (statement === undefined) return unchanged;
      const given = answered(flow, signal.option, statement.correct);
      if (statement.reply !== null) given.effects.push({ kind: 'say', lines: [statement.reply] });
      if (statement.correct) {
        given.effects.push({ kind: 'written' });
        return next(given);
      }
      if (statement.refuted) {
        given.effects.push({ kind: 'counterexample', step: flow.index, option: signal.option });
      }
      given.effects.push(opening(step, flow.index));
      return given;
    }
    case 'bet': {
      if (signal.type !== 'bet') return unchanged;
      const correct = signal.value === signal.right;
      const given = answered(flow, signal.value, correct);
      const bet = { value: signal.value, right: signal.right, correct, informal: step.informal };
      return next({ ...given, flow: { ...given.flow, bet } });
    }
    case 'draw': {
      if (signal.type === 'mirrorSpared') return enter(flow, flow.index + 1, []);
      if (signal.type !== 'mirrorChecked' || !signal.better) return unchanged;
      const attempts = flow.attempts + 1;
      return attempts >= step.attempts
        ? enter(flow, flow.index + 1, [])
        : { flow: { ...flow, attempts }, effects: [] };
    }
    default:
      // Steps done at once are never current: `enter` always moves past them.
      return unchanged;
  }
}
