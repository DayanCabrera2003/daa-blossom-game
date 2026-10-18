import { describe, expect, it } from 'vitest';
import { runOf } from '@core/cost/benchmark';
import { racesOf } from '@levels/races';
import { racesLevel } from '../../../tests/support/fixtureLevels';
import { assetEntry } from '../assets/keys';
import { stopTime } from '../picture/raceClock';
import { raceCues } from './raceCues';

// A race at 8 sprouts that Bruto finishes, then two bets, then a race at 16 where he falls asleep.
const steps = racesLevel().flow;
const [awake, asleep] = racesOf(steps);

describe('the sounds of a race (plan 06, section 1.8)', () => {
  it('a race Bruto finishes awake makes no sound of its own', () => {
    expect(awake).toBeDefined();
    expect(raceCues(steps, awake?.step ?? -1)).toEqual([]);
  });

  it('Bruto falling asleep sounds the moment his counter stops', () => {
    expect(asleep).toBeDefined();
    if (asleep === undefined) return;
    const bruto = runOf(asleep.result, 'bruto');
    expect(bruto.asleep).toBe(true);
    expect(raceCues(steps, asleep.step)).toEqual([{ key: 'sfx.brutoSleeps', at: stopTime(bruto) }]);
    expect(assetEntry('sfx.brutoSleeps').kind).toBe('sfx');
  });

  it('a step that is no race, or none at all, makes no sound', () => {
    const notRace = steps.findIndex((step) => step.step !== 'race');
    expect(raceCues(steps, notRace)).toEqual([]);
    expect(raceCues(steps, steps.length)).toEqual([]);
  });
});
