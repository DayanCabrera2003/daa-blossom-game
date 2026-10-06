/**
 * The day replaying itself (plan 03, phase 3): the sun rewinds to dawn at once and then walks the
 * day forward, one state at a time, until dusk. Pure timing only: which states the day holds (the
 * player's own, or a demo) is decided elsewhere; the plan only says which of them shows when.
 */

/** How long each state of a replayed day stays on screen, in milliseconds (greybox value). */
export const REPLAY_STEP_MS = 600;

/** A replay of a day of `states` states, and how long it lasts. */
export interface ReplayPlan {
  readonly states: number;
  /** Milliseconds from dawn until dusk is reached; a day of one state takes none. */
  readonly duration: number;
}

/** The replay of a day of `states` states (at least one). */
export const planReplay = (states: number): ReplayPlan => ({
  states,
  duration: Math.max(0, states - 1) * REPLAY_STEP_MS,
});

/**
 * The state shown `elapsed` ms after the replay starts: dawn at the start, one step forward every
 * `REPLAY_STEP_MS`, and dusk from the end on. Always a state of the day, whatever `elapsed` is.
 */
export function replayAt(plan: ReplayPlan, elapsed: number): number {
  return Math.max(0, Math.min(plan.states - 1, Math.floor(elapsed / REPLAY_STEP_MS)));
}
