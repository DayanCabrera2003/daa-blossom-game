import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { itemAt } from '@core/shared/itemAt';
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
  /** A drawn reflection was checked; `better` when it beats the player's garden. */
  | { readonly type: 'mirrorChecked'; readonly better: boolean };

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
  | {
      readonly kind: 'count';
      readonly step: number;
      readonly prompt: string;
      readonly piece: VertexId;
      readonly of: 'yours' | 'mirror';
      readonly range: number;
    }
  | { readonly kind: 'draw'; readonly attempts: number }
  | { readonly kind: 'notebook' }
  /** The last step is over: the level is complete. */
  | { readonly kind: 'finished' };

/** Where a script is, and what the player has given it so far. */
export interface FlowState {
  readonly steps: readonly LevelStep[];
  /** Which options of the level's notebook question are right, in order (empty without one). */
  readonly notebook: readonly boolean[];
  /** The index of the current step; equal to the number of steps once the script is finished. */
  readonly index: number;
  /** Every answer and bet, in the order given. */
  readonly answers: readonly FlowAnswer[];
  /** The bet placed, if any; an informal bet is kept but earns nothing. */
  readonly bet: {
    readonly value: number;
    readonly correct: boolean;
    readonly informal: boolean;
  } | null;
  /** Better reflections checked in the current `draw` step. */
  readonly attempts: number;
}

/** The answer to the engine: the script after a signal, and what to show for it. */
export type FlowStep = { flow: FlowState; effects: FlowEffect[] };

/** The step being played, or null once the script is finished. */
export const currentStep = (flow: FlowState): LevelStep | null => flow.steps[flow.index] ?? null;

/** Whether every step of the script is over. */
export const isFinished = (flow: FlowState): boolean => flow.index >= flow.steps.length;

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
      return {
        kind: 'count',
        step: index,
        prompt: step.prompt,
        piece: step.piece,
        of: step.of,
        range: step.range,
      };
    case 'draw':
      return { kind: 'draw', attempts: step.attempts };
    case 'notebook':
      return { kind: 'notebook' };
  }
}

/** Steps that are over as soon as they are shown: the scene plays them out on its own. */
const AT_ONCE: ReadonlySet<LevelStep['step']> = new Set(['say', 'replay', 'mirror']);

/**
 * Opens the step at `index` and every step after it that finishes at once, until one waits for the
 * player or the script ends.
 */
function enter(flow: FlowState, index: number, effects: FlowEffect[]): FlowStep {
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
  key: { readonly notebook: readonly boolean[] },
): FlowStep {
  const flow: FlowState = {
    steps,
    notebook: key.notebook,
    index: 0,
    answers: [],
    bet: null,
    attempts: 0,
  };
  return enter(flow, 0, []);
}

/** Records an answer to the current step, with the effect that reports it. */
function answered(flow: FlowState, value: number, correct: boolean): FlowStep {
  const answer = { step: flow.index, value, correct };
  return {
    flow: { ...flow, answers: [...flow.answers, answer] },
    effects: [{ kind: 'answered', ...answer }],
  };
}

/** Feeds one signal to the current step. A signal the step does not wait for changes nothing. */
export function advanceFlow(flow: FlowState, signal: FlowSignal): FlowStep {
  const step = currentStep(flow);
  const unchanged: FlowStep = { flow, effects: [] };
  if (step === null) return unchanged;
  const next = (from: FlowStep): FlowStep => enter(from.flow, flow.index + 1, from.effects);

  switch (step.step) {
    case 'play':
      return signal.type === 'won' ? enter(flow, flow.index + 1, []) : unchanged;
    case 'sun':
      return signal.type === 'sunMoved' ? enter(flow, flow.index + 1, []) : unchanged;
    case 'separate':
      return signal.type === 'tap' ? enter(flow, flow.index + 1, []) : unchanged;
    case 'explore':
      return signal.type === 'tapSprout'
        ? enter(flow, flow.index + 1, [{ kind: 'sproutTapped', vertex: signal.vertex }])
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
    case 'notebook': {
      if (signal.type !== 'answer' || signal.option >= flow.notebook.length) return unchanged;
      const correct = itemAt(flow.notebook, signal.option);
      const given = answered(flow, signal.option, correct);
      return correct ? next(given) : given;
    }
    case 'bet': {
      if (signal.type !== 'bet') return unchanged;
      const correct = signal.value === signal.right;
      const given = answered(flow, signal.value, correct);
      const bet = { value: signal.value, correct, informal: step.informal };
      return next({ ...given, flow: { ...given.flow, bet } });
    }
    case 'draw': {
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
