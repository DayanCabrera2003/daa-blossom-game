/**
 * How property-based tests are seeded, read from the environment:
 * - default: a fixed seed, so a run (and CI) is reproducible bit for bit;
 * - `FC_SEED=<integer>`: replay the seed fast-check printed for a failure;
 * - `FC_SEED=random`: a fresh seed each run, to explore new graphs (`npm run test:explore`);
 * - `FC_RUNS=<positive integer>`: cases per property (fast-check's default is 100).
 * A fixed seed alone would never find new counterexamples (the flower lemma one was found by a
 * random run), so exploring is a separate, deliberate command rather than the default.
 */

/** The project seed: the day the design was settled (2026-09-29). */
export const DEFAULT_SEED = 20260929;

/** Cases per property when exploring. */
export const EXPLORE_RUNS = 2000;

/** The subset of fast-check's global parameters this project sets. */
export interface FastCheckSettings {
  seed?: number;
  numRuns?: number;
}

/** Translates `FC_SEED` and `FC_RUNS` into fast-check settings; unreadable values throw. */
export function fastCheckSettings(
  env: Readonly<Record<string, string | undefined>>,
): FastCheckSettings {
  const settings: FastCheckSettings = {};

  const seed = env['FC_SEED'];
  if (seed === undefined || seed === '') settings.seed = DEFAULT_SEED;
  else if (seed !== 'random') {
    if (!/^-?\d+$/.test(seed))
      throw new Error(`FC_SEED must be an integer or "random", got "${seed}"`);
    settings.seed = Number(seed);
  }

  const runs = env['FC_RUNS'];
  if (runs !== undefined && runs !== '') {
    if (!/^\d+$/.test(runs) || Number(runs) === 0) {
      throw new Error(`FC_RUNS must be a positive integer, got "${runs}"`);
    }
    settings.numRuns = Number(runs);
  }

  return settings;
}
