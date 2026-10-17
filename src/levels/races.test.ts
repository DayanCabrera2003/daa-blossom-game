import { race } from '@core/cost/benchmark';
import { raceGarden } from '@core/generators/raceGarden';
import { describe, expect, it } from 'vitest';
import type { LevelStep } from './flow';
import { raceBetVerdict, raceOf, racesAround, racesOf } from './races';

const race8: LevelStep = { step: 'race', family: 'half', size: 8, seed: 3, budget: 100_000 };
const race16: LevelStep = { step: 'race', family: 'half', size: 16, seed: 26, budget: 1_000 };
const onBruto: LevelStep = { step: 'raceBet', prompt: 'ch6.5.sauce.01', runner: 'bruto' };
const onAutomaton: LevelStep = { step: 'raceBet', prompt: 'ch6.5.sauce.02', runner: 'automaton' };
const say: LevelStep = { step: 'say', lines: ['ch6.5.sauce.00'] };

describe('the races of a level script', () => {
  it('races the garden a race step names, with its budget for Bruto', () => {
    expect(raceOf({ family: 'half', size: 8, seed: 3, budget: 100_000 })).toEqual(
      race(raceGarden('half', 8, 3), 100_000),
    );
  });

  it('runs a race once, however many times it is asked for', () => {
    const step = { family: 'half', size: 10, seed: 4, budget: 100_000 } as const;
    expect(raceOf({ ...step })).toBe(raceOf({ ...step }));
  });

  it('lists the races of a script in order, with the index of each step', () => {
    const races = racesOf([say, race8, onBruto, race16]);
    expect(races.map(({ step, result }) => [step, result.n])).toEqual([
      [1, 8],
      [3, 16],
    ]);
  });

  it('finds the races a bet stands between: the last one before it and the first one after', () => {
    expect(racesAround([race8, onAutomaton, say, onBruto, race16], 3)).toEqual({
      before: 0,
      after: 4,
    });
    expect(racesAround([onBruto, race16], 0)).toEqual({ before: null, after: 1 });
    expect(racesAround([race8, onBruto], 1)).toEqual({ before: 0, after: null });
  });

  it('answers a bet from the steps its runner took in those two races', () => {
    // Sixteen sprouts tire Bruto out at a thousand steps: far more, clearly.
    expect(raceBetVerdict([race8, onBruto, race16], 1)).toEqual({
      answer: 'farMore',
      clear: true,
    });
    const verdict = raceBetVerdict([race8, onAutomaton, race16], 1);
    expect(verdict?.answer).not.toBe('farMore');
  });

  it('has no answer for a bet without a race on each side, or for a step that is no bet', () => {
    expect(raceBetVerdict([onBruto, race16], 0)).toBeNull();
    expect(raceBetVerdict([race8, onBruto], 1)).toBeNull();
    expect(raceBetVerdict([race8, onBruto, race16], 0)).toBeNull();
  });
});
