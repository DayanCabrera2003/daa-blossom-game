import type { Matching } from '@core/matching/types';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import { rightBet, rightCount } from './answerKey';

/**
 * The questions of a script as the player sees them (plan 03, phases 4 and 6): what is asked, the
 * options on offer and which of them are right. Pure. The right answers that depend on the garden
 * (a bet, a count) come from the core through `answerKey.ts`, never from the level file. What the
 * mentor says after an answer is the reply of the option, which the script engine says on its own.
 */

/** One option of a question. */
export interface QuestionOption {
  /**
   * What choosing it gives the script: the option's index in an ask or the notebook, the number in a
   * bet or count.
   */
  readonly value: number;
  /** The line id of a written option; null for a number, which shows as itself. */
  readonly line: string | null;
}

/** A question on screen: an ask, a bet, a count or the notebook. */
export interface Question {
  readonly kind: 'ask' | 'bet' | 'count' | 'notebook';
  /** The index of the step that asks, in the script. */
  readonly step: number;
  readonly prompt: string;
  readonly options: readonly QuestionOption[];
  /** The values of the right options (several in an ask where more than one answer is valid). */
  readonly right: readonly number[];
  /** Milliseconds the garden is shown before a bet veils it; null when it is never veiled. */
  readonly preview: number | null;
}

/** The whole numbers from `from` to `to`, as options that show as themselves. */
const numbers = (from: number, to: number): QuestionOption[] =>
  Array.from({ length: to - from + 1 }, (_, k) => ({ value: from + k, line: null }));

/**
 * The question of the step at `index` of the level's script, judged on the player's lanterns
 * `yours`; null when that step asks nothing. A bet offers 1 to its range (a garden worth a bet lights some), a
 * count 0 to its range (a piece may hold none of one side).
 */
export function questionAt(level: Level, index: number, yours: Matching): Question | null {
  const step = level.flow[index];
  if (step === undefined) return null;
  const base = { step: index, preview: null };
  switch (step.step) {
    case 'ask':
      return {
        ...base,
        kind: 'ask',
        prompt: step.prompt,
        options: step.options.map((option, value) => ({ value, line: option.line })),
        right: step.options.flatMap((option, value) => (option.correct ? [value] : [])),
      };
    case 'bet':
      return {
        ...base,
        kind: 'bet',
        prompt: step.prompt,
        options: numbers(1, step.range),
        right: [rightBet(level)],
        preview: step.preview ?? null,
      };
    case 'count':
      // Level integrity gives every count a reflection to count on.
      invariant(level.mirror !== null, 'a count needs the reflection of its level');
      return {
        ...base,
        kind: 'count',
        prompt: step.prompt,
        options: numbers(0, step.range),
        right: [rightCount(yours, level.mirror, step)],
      };
    case 'notebook': {
      // Level integrity gives every notebook step the notebook question of its level.
      const { notebook } = level.data;
      invariant(notebook !== undefined, 'a notebook step needs the notebook of its level');
      return {
        ...base,
        kind: 'notebook',
        prompt: notebook.prompt,
        options: notebook.options.map((option, value) => ({ value, line: option.line })),
        right: notebook.options.flatMap((option, value) => (option.correct ? [value] : [])),
      };
    }
    default:
      return null;
  }
}

/**
 * The option a grade-3 hint points at: the first right one of an ask or a count. A bet is a guess
 * the player makes before knowing, so a hint never gives it away.
 */
export const hintedOption = (question: Question): number | null =>
  question.kind === 'bet' ? null : (question.right[0] ?? null);
