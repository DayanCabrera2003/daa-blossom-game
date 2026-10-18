/**
 * The day replaying itself (plan 03, phase 3): the sun rewinds to dawn at once and then walks the
 * day forward, one state at a time, until dusk. Pure timing only: which states the day holds (the
 * player's own, or a demo) is decided elsewhere; the plan only says which of them shows when.
 */

/** How long each state of a replayed day stays on screen, in milliseconds (greybox value). */
export const REPLAY_STEP_MS = 600;

/**
 * The quickest a long day steps when it has to fit a time (the mechanical gardener's run in the
 * free mode, hundreds of moves in a garden of 24 sprouts): still a state the eye can follow.
 */
export const MIN_REPLAY_STEP_MS = 60;

/** A replay of a day of `states` states, how long each stays on screen, and how long it lasts. */
export interface ReplayPlan {
  readonly states: number;
  /** Milliseconds each state stays on screen. */
  readonly step: number;
  /** Milliseconds from dawn until dusk is reached; a day of one state takes none. */
  readonly duration: number;
}

/**
 * The replay of a day of `states` states (at least one), a step every `REPLAY_STEP_MS`; asked to
 * fit `within` milliseconds, a long day steps faster, down to `MIN_REPLAY_STEP_MS`.
 */
export function planReplay(states: number, within = Infinity): ReplayPlan {
  const steps = Math.max(0, states - 1);
  const fitted = steps === 0 ? REPLAY_STEP_MS : Math.floor(within / steps);
  const step = Math.max(MIN_REPLAY_STEP_MS, Math.min(REPLAY_STEP_MS, fitted));
  return { states, step, duration: steps * step };
}

/**
 * The state shown `elapsed` ms after the replay starts: dawn at the start, one step forward every
 * step of the plan, and dusk from the end on. Always a state of the day, whatever `elapsed` is.
 */
export function replayAt(plan: ReplayPlan, elapsed: number): number {
  return Math.max(0, Math.min(plan.states - 1, Math.floor(elapsed / plan.step)));
}
