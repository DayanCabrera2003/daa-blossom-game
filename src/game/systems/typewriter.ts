import { MIX } from '../audio/mix';
import type { Speaker } from './speaker';

/**
 * How fast a speaker's line is typed into the dialogue box: characters per second, and the pause
 * after a comma and after the end of a sentence, in ms.
 */
export interface Pace {
  readonly lettersPerSecond: number;
  readonly commaPause: number;
  readonly stopPause: number;
}

/**
 * The pace of each speaker (plan 06, section 1.9; GDD §3.2): the mentor calm, the gnome hurried,
 * the oaks slow and solemn, the gardener and the notebook plain. A table of the mix
 * (`audio/mix.ts`, plan 09, phase 8), where the author tunes it by ear.
 */
export const PACES: Readonly<Record<Speaker, Pace>> = MIX.paces;

/** Marks after which the voice takes a short breath. */
const COMMAS = new Set([',', ';', ':']);

/** Marks that end a sentence, after which the voice takes a long breath. */
const STOPS = new Set(['.', '?', '!', '…']);

/** Whether `char` is a mark the voice pauses after. */
const isMark = (char: string | undefined): boolean =>
  char !== undefined && (COMMAS.has(char) || STOPS.has(char));

/**
 * The pause after `char` when `next` follows it: none inside a run of marks (`...`, `?!`), so the
 * run pauses once, after its last mark, as long as that mark asks for.
 */
function pauseAfter(char: string, next: string | undefined, pace: Pace): number {
  if (isMark(next)) return 0;
  if (STOPS.has(char)) return pace.stopPause;
  return COMMAS.has(char) ? pace.commaPause : 0;
}

/**
 * When each character of `text` appears, in ms after the line starts: the first at once, each
 * next one a beat later, plus the pause after a mark. Characters are code points (`Array.from`), so
 * one outside the basic plane counts once.
 */
export function revealTimes(text: string, pace: Pace): number[] {
  const chars = Array.from(text);
  const beat = 1000 / pace.lettersPerSecond;
  const times: number[] = [];
  let at = 0;
  chars.forEach((char, i) => {
    times.push(at);
    at += beat + pauseAfter(char, chars[i + 1], pace);
  });
  return times;
}

/** How many characters have appeared `elapsed` ms after the line started (all, once it is over). */
export const visibleCount = (times: readonly number[], elapsed: number): number =>
  times.filter((time) => time <= elapsed).length;
