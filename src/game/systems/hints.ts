import type { GardenState } from '@core/rules/state';
import { measure, raiseRecord, surpasses, type ProgressRecord } from './progress';

/** Time without progress after which a hint is offered (GDD §5.3). */
export const HINT_DELAY_MS = 90_000;
/** Refused moves in a row after which a hint is offered. */
export const HINT_REJECTIONS = 3;
/** Hints come in three grades: a nudge, a direction, the first step done by the mentor. */
export const MAX_HINT_GRADE = 3;

/**
 * What the hint system remembers: since when the player is waiting, refusals in a row, grades
 * opened, and the best the play has reached (`progress.ts`), which only real progress beats.
 */
export interface HintState {
  readonly since: number;
  readonly rejections: number;
  readonly opened: number;
  readonly record: ProgressRecord;
}

/** The hint system as a level starts at time `now` (milliseconds), on its starting `garden`. */
export const startHints = (now: number, garden: GardenState): HintState => ({
  since: now,
  rejections: 0,
  opened: 0,
  record: measure(garden),
});

/**
 * A step of the script that begins, leaving `garden`: the wait starts again and refusals are
 * forgotten; what the garden reached by itself (the light's own search) joins the record.
 */
export const afterAccepted = (hints: HintState, garden: GardenState, now: number): HintState => ({
  ...hints,
  since: now,
  rejections: 0,
  record: raiseRecord(hints.record, garden),
});

/**
 * An accepted move that leaves `garden`. Only progress counts (GDD §5.3): a move that beats the
 * record starts the wait again and forgets the refusals; one that does not (joining and splitting
 * in a loop, marking again what was undone) changes neither, so going round in circles still brings
 * a hint closer.
 */
export function afterMoved(hints: HintState, garden: GardenState, now: number): HintState {
  const record = raiseRecord(hints.record, garden);
  return surpasses(hints.record, garden)
    ? { ...hints, since: now, rejections: 0, record }
    : { ...hints, record };
}

/** A refused move counts towards offering help. */
export const afterRejected = (hints: HintState): HintState => ({
  ...hints,
  rejections: hints.rejections + 1,
});

/**
 * Whether a hint is on offer: after 90 s without progress or three refusals in a row, while grades
 * remain. Hints are offered, never imposed: the player decides whether to open one.
 */
export function isHintOffered(hints: HintState, now: number): boolean {
  const stuck = now - hints.since >= HINT_DELAY_MS || hints.rejections >= HINT_REJECTIONS;
  return hints.opened < MAX_HINT_GRADE && stuck;
}

/** Opens the offered hint: its grade, and a fresh wait before the next one is offered. */
export function openHint(
  hints: HintState,
  now: number,
): { hints: HintState; grade: number } | null {
  if (!isHintOffered(hints, now)) return null;
  const grade = hints.opened + 1;
  return { hints: { ...hints, since: now, rejections: 0, opened: grade }, grade };
}
