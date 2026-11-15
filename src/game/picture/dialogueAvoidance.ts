import type { Avoidance } from './panelAvoidance';

/**
 * What the dialogue box keeps clear of when it opens for a run of lines: what the step on screen
 * points at, as every panel does, and also the sprouts the lines name, so the box never hides the
 * sprout the mentor is talking about while some spot leaves it in sight. Pure.
 */

/**
 * The words of one letter the game's language uses on their own (Spanish "a", "e", "o", "u", "y"),
 * in either case: a sprout labelled so is not told apart from the word, so they never name one.
 */
const ONE_LETTER_WORDS: ReadonlySet<string> = new Set(['a', 'e', 'o', 'u', 'y']);

/** The words of a text: runs of letters and digits. */
const wordsOf = (text: string): string[] => text.match(/[\p{L}\p{N}]+/gu) ?? [];

/**
 * The labels among `labels` (in their order) that some text of `texts` writes as a word of its
 * own, in the same case; never one of the words of one letter of the language.
 */
export function namedLabels(texts: readonly string[], labels: readonly string[]): string[] {
  const words = new Set(texts.flatMap(wordsOf));
  return labels.filter((label) => words.has(label) && !ONE_LETTER_WORDS.has(label.toLowerCase()));
}

/** What the dialogue box keeps clear of while it says `texts`, over the garden `avoid` tells. */
export function dialogueAvoidance(avoid: Avoidance, texts: readonly string[]): Avoidance {
  const { sprouts } = avoid;
  if (sprouts === undefined) return avoid;
  const named = namedLabels(texts, [...sprouts.keys()]).flatMap(
    (label) => sprouts.get(label) ?? [],
  );
  return named.length === 0 ? avoid : { ...avoid, referred: [...avoid.referred, ...named] };
}
