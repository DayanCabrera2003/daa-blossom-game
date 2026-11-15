/**
 * How long a toast stays in sight before it fades, from the length of its message. Every toast used
 * to stay 2.6 s, enough for a short refusal but not for one of 130 letters, which went before it was
 * read. Now it is a reading time: a second to notice the toast and look at it, then the letters at
 * 14 a second, a slow, easy pace (subtitles for children are paced near 13 letters a second, and
 * those for adults near 17), since the player reads it while thinking about the garden. It never
 * stays less than the 2.6 s of before, and never more than 10 s: a longer message is held by a
 * finger, which keeps it in sight for as long as it is held.
 */

/** The time to notice a toast and look at it, before reading starts, in milliseconds. */
const NOTICE_MS = 1000;
/** The reading pace, in letters a second. */
const LETTERS_PER_SECOND = 14;
/** The shortest stay: every toast's stay before it depended on the length. */
export const TOAST_SHORTEST_MS = 2600;
/** The longest stay: past it, a toast that is still being read is held with a finger. */
export const TOAST_LONGEST_MS = 10000;
/** How long the toast takes to fade once its stay is over, in milliseconds. */
export const TOAST_FADE_MS = 400;

/** How long a toast with `message` stays in sight before it fades, in milliseconds. */
export function toastDuration(message: string): number {
  // Letters, not UTF-16 code units: an accented letter or a symbol is read as one.
  const letters = [...message].length;
  const reading = NOTICE_MS + Math.round((letters * 1000) / LETTERS_PER_SECOND);
  return Math.min(TOAST_LONGEST_MS, Math.max(TOAST_SHORTEST_MS, reading));
}
