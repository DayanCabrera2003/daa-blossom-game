import type { Labels } from '@core/graph/labels';
import { createGardenState, type GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import { ok, type Result } from '@core/shared/result';
import type { Level } from './build';
import { buildGarden, type GardenError } from './garden';
import type { CounterexampleData } from './notebook';

/**
 * A counterexample of the notebook (GDD §5.5, plan 03, phase 6) ready to touch: a small garden
 * built with the core, under the same rules as a level. It has no victory: the player only looks,
 * tries, and sees the false statement fail.
 */
export interface Counterexample {
  readonly data: CounterexampleData;
  readonly mode: CounterexampleData['mode'];
  /** The line that presents the garden. */
  readonly line: string;
  /** In `mirrorDraw`, the line said when the chain shows; null in `play`. */
  readonly found: string | null;
  readonly labels: Labels;
  /**
   * The garden as it opens. In `play` it allows exactly the counterexample's actions; in
   * `mirrorDraw` none, since the player draws a reflection over it instead of moving lanterns.
   */
  readonly start: GardenState;
}

/** Builds a counterexample from its validated data; a garden that is not one is reported. */
export function buildCounterexample(data: CounterexampleData): Result<Counterexample, GardenError> {
  const built = buildGarden({
    names: data.sprouts.map((sprout) => sprout.label),
    vines: data.vines,
    lanterns: data.lanterns,
  });
  if (!built.ok) return built;
  const { labels, graph, matching } = built.value;
  const start = createGardenState({
    graph,
    matching,
    allowed: data.mode === 'play' ? data.actions : [],
  });
  return ok({
    data,
    mode: data.mode,
    line: data.line,
    found: data.mode === 'mirrorDraw' ? data.found : null,
    labels,
    start,
  });
}

/**
 * The counterexample of statement `option` of the level's notebook, built; null for a statement
 * with none (a true one, one answered only in words) or not on offer. Level integrity builds every
 * counterexample, so one that does not build here is a bug.
 */
export function counterexampleAt(level: Level, option: number): Counterexample | null {
  const data = level.data.notebook?.options[option]?.counterexample;
  if (data === undefined) return null;
  const built = buildCounterexample(data);
  invariant(built.ok, 'a counterexample does not build; run npm run check-levels');
  return built.value;
}
