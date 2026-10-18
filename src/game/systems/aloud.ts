import type { LevelStep } from '@levels/flow';
import type { Translate } from '@services/i18n';
import type { SpokenLine } from './speaker';

/**
 * What a screen reader is told of the game (plan 09, phase 6), through the page's live region: each
 * line of dialogue whole, as soon as it starts (never letter by letter as it is typed), with who
 * says it; each question with its options numbered as the digits that pick them; and whether an
 * answer was the one. Pure: the words are the locale's, the scene sends them.
 */

/** A line of dialogue as it is said aloud: the speaker's name, then the whole line. */
export const lineAloud = (t: Translate, line: SpokenLine): string =>
  t('a11y.line', { speaker: t(`speaker.${line.speaker}`), text: line.text });

/** A question as it is said aloud: its prompt, then each option after its number. */
export const questionAloud = (t: Translate, prompt: string, options: readonly string[]): string =>
  t('a11y.question', {
    prompt,
    options: options.map((option, i) => t('a11y.option', { number: i + 1, option })).join(' '),
  });

/** The steps whose answer is a guess, told only once the garden shows how it turned out. */
const GUESSES: readonly LevelStep['step'][] = ['bet', 'raceBet'];

/**
 * Whether the answer to a question of step kind `step` was the one, said aloud; null for a bet,
 * whose outcome the screen keeps for later too, and for a step that is not known.
 */
export function answerAloud(
  t: Translate,
  step: LevelStep['step'] | undefined,
  correct: boolean,
): string | null {
  if (step === undefined || GUESSES.includes(step)) return null;
  return t(correct ? 'a11y.answerRight' : 'a11y.answerWrong');
}
