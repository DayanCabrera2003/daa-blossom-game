import { describe, expect, it } from 'vitest';
import { DURATIONS, planAnimation } from './plan';
import { chainLandings } from './landings';

describe('where and when a chain lands', () => {
  it('lands once, as its last hop ends, where the new lantern is lit', () => {
    const steps = planAnimation([{ type: 'augment', path: [0, 1, 2, 3] }]);
    expect(chainLandings(steps)).toEqual([{ at: 3 * DURATIONS.hop, u: 2, v: 3 }]);
  });

  it('lands each chain of a plan after its own hops, counting the steps before it', () => {
    const steps = planAnimation([
      { type: 'light', u: 4, v: 5 },
      { type: 'augment', path: [0, 1] },
      { type: 'searchCleared' },
      { type: 'augment', path: [2, 3] },
    ]);
    expect(chainLandings(steps)).toEqual([
      { at: DURATIONS.light + DURATIONS.hop, u: 0, v: 1 },
      { at: DURATIONS.light + 2 * DURATIONS.hop + DURATIONS.clear, u: 2, v: 3 },
    ]);
  });

  it('has nothing to land without hops', () => {
    expect(chainLandings(planAnimation([{ type: 'light', u: 0, v: 1 }]))).toEqual([]);
    expect(chainLandings([])).toEqual([]);
  });
});
