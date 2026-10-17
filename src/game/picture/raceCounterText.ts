import type { Runner } from '@core/cost/benchmark';
import type { CounterPicture } from './raceClock';

/**
 * What the counter of a runner says at one moment of a race (GDD 6.4, 6.5): his steps so far, his
 * steps and the finish once he reached it, or that he fell asleep. Asleep, the counter shows no
 * number: what Bruto ran out of is his budget, which is no result of the race.
 */

/** An interface text, as a key of `content/`, and its parameters. */
export interface CounterText {
  readonly key: string;
  readonly params: Readonly<Record<string, number>>;
}

/** The text of the counter of `runner` showing `counter`. */
export function raceCounterText(runner: Runner, counter: CounterPicture): CounterText {
  if (counter.asleep) return { key: `race.counter.${runner}Asleep`, params: {} };
  const key = counter.finished ? `race.counter.${runner}Done` : `race.counter.${runner}`;
  return { key, params: { steps: counter.steps } };
}
