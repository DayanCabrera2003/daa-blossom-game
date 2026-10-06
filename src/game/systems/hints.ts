/** Time without progress after which a hint is offered (GDD §5.3). */
export const HINT_DELAY_MS = 90_000;
/** Refused moves in a row after which a hint is offered. */
export const HINT_REJECTIONS = 3;
/** Hints come in three grades: a nudge, a direction, the first step done by the mentor. */
export const MAX_HINT_GRADE = 3;

/** What the hint system remembers: since when the player is waiting, refusals in a row, grades opened. */
export interface HintState {
  readonly since: number;
  readonly rejections: number;
  readonly opened: number;
}

/** The hint system as a level starts at time `now` (milliseconds). */
export const startHints = (now: number): HintState => ({ since: now, rejections: 0, opened: 0 });

/** An accepted move is progress: the wait starts again and refusals are forgotten. */
export const afterAccepted = (hints: HintState, now: number): HintState => ({
  ...hints,
  since: now,
  rejections: 0,
});

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
  return { hints: { since: now, rejections: 0, opened: grade }, grade };
}
