import type { Run } from '@core/cost/benchmark';

/**
 * The clock of a race on screen (6.4, 6.5): how many steps each counter shows a while after the
 * start. Both runners share one clock, so at every moment they stand at the same count until one
 * of them reaches his own steps and stops: whoever needs fewer steps finishes first, as in the
 * race the core ran. The clock doubles its count at a steady pace, so 40 steps and a million both
 * fit in a few seconds; a straight pace would make the player wait hours for Bruto.
 */

/** Milliseconds for the clock to double its count. */
export const STEP_DOUBLING_MS = 400;

/** Milliseconds the counters stay still at the end, so the player can read them. */
export const FINISH_PAUSE_MS = 1_200;

/** The count of the clock `elapsed` milliseconds after the start: 0, 1, 3, 7… */
export const stepsAt = (elapsed: number): number =>
  elapsed <= 0 ? 0 : Math.floor(2 ** (elapsed / STEP_DOUBLING_MS)) - 1;

/** When the clock reaches `steps`, in milliseconds after the start. */
const timeFor = (steps: number): number => STEP_DOUBLING_MS * Math.log2(steps + 1);

/** When a runner's counter stops, at the finish or asleep, in milliseconds after the start. */
export const stopTime = (run: Run): number => timeFor(run.steps);

/** One counter of a race at one moment. */
export interface CounterPicture {
  /** The steps shown; a runner who stopped shows his own, asleep or not. */
  readonly steps: number;
  /** Whether he reached the finish: all lanterns lit. */
  readonly finished: boolean;
  /** Whether he fell asleep before the finish (Bruto, when his budget runs out). */
  readonly asleep: boolean;
}

/** The counter of one runner `elapsed` milliseconds after the start (Infinity: the race is over). */
export function counterAt(run: Run, elapsed: number): CounterPicture {
  const stopped = elapsed >= timeFor(run.steps);
  return {
    steps: stopped ? run.steps : Math.min(stepsAt(elapsed), run.steps),
    finished: stopped && !run.asleep,
    asleep: stopped && run.asleep,
  };
}

/** How long a race lasts on screen: until the slower runner stops, then the pause. */
export const raceDuration = (runs: readonly Run[]): number =>
  Math.max(0, ...runs.map((run) => timeFor(run.steps))) + FINISH_PAUSE_MS;
