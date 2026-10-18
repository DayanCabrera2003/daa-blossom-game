/**
 * The names of the sprouts of a garden of the free mode (plan 08, phase 8): single capital letters
 * of the alphabet, A to Z, without Ñ nor double letters, so a name is one glyph under its sprout
 * and never confused with another. Twenty-six are more than the sprouts a design may hold.
 */

/** The letters a sprout of the free mode may be named with, in the order they are given. */
export const LETTERS: readonly string[] = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/** The first letter that no sprout of `taken` is named yet; null when all of them are. */
export function nextName(taken: Iterable<string>): string | null {
  const used = new Set(taken);
  return LETTERS.find((letter) => !used.has(letter)) ?? null;
}
