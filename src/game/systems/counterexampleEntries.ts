import type { PlaytestEntry } from '@services/playtestLog';
import type { CounterexampleEffect } from './counterexampleController';
import { mirrorCheckEntry } from './playtestEntries';

/**
 * What the playtest log records on the counterexample screen of `level` (GDD §10, Hito A): the
 * reflections checked over a `mirrorDraw` garden, as in the mirror challenge. Its opening is logged
 * by the level that opens it, and moves on a counterexample are only looking, so they are not
 * logged. Pure: `at` is the clock.
 */
export function counterexampleEntries(
  level: string,
  effects: readonly CounterexampleEffect[],
  at: number,
): PlaytestEntry[] {
  return effects.flatMap((effect) =>
    effect.kind === 'mirrorChecked' ? [mirrorCheckEntry(effect.check, at, level)] : [],
  );
}
