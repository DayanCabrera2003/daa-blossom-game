import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, EXPLORE_RUNS, fastCheckSettings } from './fastCheckSettings';

describe('fast-check settings from the environment', () => {
  it('uses the fixed project seed by default, so every run (and CI) is reproducible', () => {
    expect(fastCheckSettings({})).toEqual({ seed: DEFAULT_SEED });
  });

  it('replays a reported seed exactly', () => {
    expect(fastCheckSettings({ FC_SEED: '-1721115552' })).toEqual({ seed: -1721115552 });
  });

  it('explores with a fresh seed each run when asked for random', () => {
    expect(fastCheckSettings({ FC_SEED: 'random' })).toEqual({});
  });

  it('takes the number of runs per property from FC_RUNS', () => {
    expect(fastCheckSettings({ FC_SEED: 'random', FC_RUNS: String(EXPLORE_RUNS) })).toEqual({
      numRuns: EXPLORE_RUNS,
    });
  });

  it('rejects values it cannot understand instead of silently ignoring them', () => {
    expect(() => fastCheckSettings({ FC_SEED: 'banana' })).toThrow(/FC_SEED/);
    expect(() => fastCheckSettings({ FC_RUNS: '0' })).toThrow(/FC_RUNS/);
    expect(() => fastCheckSettings({ FC_RUNS: '2.5' })).toThrow(/FC_RUNS/);
  });
});
