import type { GardenState } from '@core/rules/state';
import { measure, raiseRecord, surpasses, type ProgressRecord } from './progress';

/** Time without progress after which a hint is offered (GDD §5.3). */
export const HINT_DELAY_MS = 90_000;
/** Refused moves in a row after which a hint is offered. */
export const HINT_REJECTIONS = 3;
/**
 * Hints come in three grades: a nudge, a direction, the next step done by the mentor. The third
 * can be asked for again and again.
 */
export const MAX_HINT_GRADE = 3;

/**
 * What the hint system remembers: since when the player is waiting, refusals in a row, how many
 * hints have been opened in the whole level (for the star without hints), the grade of the last
 * one opened since the grades started again (0 for none), and the best the play has reached
 * (`progress.ts`), which only real progress beats.
 */
export interface HintState {
  readonly since: number;
  readonly rejections: number;
  readonly opened: number;
  readonly grade: number;
  readonly record: ProgressRecord;
}

/** The hint system as a level starts at time `now` (milliseconds), on its starting `garden`. */
export const startHints = (now: number, garden: GardenState): HintState => ({
  since: now,
  rejections: 0,
  opened: 0,
  grade: 0,
  record: measure(garden),
});

/**
 * A step of the script that begins, leaving `garden`: the wait starts again, refusals are forgotten
 * and the grades start again from the first (GDD §5.3); what the garden reached by itself (the
 * light's own search) joins the record.
 */
export const afterAccepted = (hints: HintState, garden: GardenState, now: number): HintState => ({
  ...hints,
  since: now,
  rejections: 0,
  grade: 0,
  record: raiseRecord(hints.record, garden),
});

/**
 * An accepted move that leaves `garden`. Only progress counts (GDD §5.3): a move that beats the
 * record starts the wait again and forgets the refusals; one that does not (joining and splitting
 * in a loop, marking again what was undone) changes neither, so going round in circles still brings
 * a hint closer. A chain lit, more lanterns than ever in this play, also starts the grades again:
 * the next round has hints of its own.
 */
export function afterMoved(hints: HintState, garden: GardenState, now: number): HintState {
  const record = raiseRecord(hints.record, garden);
  const grade = record.lanterns > hints.record.lanterns ? 0 : hints.grade;
  return surpasses(hints.record, garden)
    ? { ...hints, since: now, rejections: 0, grade, record }
    : { ...hints, grade, record };
}

/** A refused move counts towards offering help. */
export const afterRejected = (hints: HintState): HintState => ({
  ...hints,
  rejections: hints.rejections + 1,
});

/**
 * Whether a hint is on offer: after 90 s without progress or three refusals in a row. Hints are
 * offered, never imposed: the offer only makes the hint button glow, and the player decides
 * whether to open one. The third grade repeats, so there is always one to offer.
 */
export const isHintOffered = (hints: HintState, now: number): boolean =>
  now - hints.since >= HINT_DELAY_MS || hints.rejections >= HINT_REJECTIONS;

/**
 * Opens the next hint, offered or not (GDD §5.3: the button is always at hand; the offer only makes
 * it glow): the grade after the last one opened, or the third again once it is reached, and a fresh
 * wait before the next one is offered. Every hint opened counts for the star without hints.
 */
export function openHint(hints: HintState, now: number): { hints: HintState; grade: number } {
  const grade = nextGrade(hints);
  const opened = hints.opened + 1;
  return { hints: { ...hints, since: now, rejections: 0, opened, grade }, grade };
}

/** The grade the next hint opens at: the one after the last opened, or the third again. */
export const nextGrade = (hints: HintState): number => Math.min(hints.grade + 1, MAX_HINT_GRADE);
