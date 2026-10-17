import { runOf, type RaceResult } from '@core/cost/benchmark';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { racesOf } from '@levels/races';
import { describe, expect, it } from 'vitest';

/**
 * The lessons of the races (GDD §7, chapter 6, levels 6.4 and 6.5) that their gardens must really
 * hold, checked with the core: in a small garden the automaton and Bruto finish close together,
 * and every sprout more multiplies Bruto's work while the recipe's grows gently, until Bruto falls
 * asleep. The gardens are grown from fixed families and seeds, chosen so the races tell this
 * clearly; Bruto's budget keeps every race quick.
 */

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** The races of a level, by the size of their gardens. */
const racesBySize = (level: Level): Map<number, RaceResult> =>
  new Map(racesOf(level.flow).map(({ race, result }) => [race.size, result]));

/** The race of a level at one size. */
const raceAt = (races: Map<number, RaceResult>, n: number): RaceResult => {
  const race = races.get(n);
  if (race === undefined) throw new Error(`no race of ${n} sprouts`);
  return race;
};

/** How many times the automaton's steps Bruto took. */
const brutoOverAutomaton = (race: RaceResult): number =>
  runOf(race, 'bruto').steps / runOf(race, 'automaton').steps;

describe('6.4, race I: 6, 8 and 10 sprouts', () => {
  const level = levelOf('6.4');
  const races = racesBySize(level);

  it('races three gardens of 6, 8 and 10 sprouts, and Bruto finishes every one', () => {
    expect([...races.keys()]).toEqual([6, 8, 10]);
    for (const race of races.values()) expect(runOf(race, 'bruto').asleep).toBe(false);
  });

  it('at 6 sprouts, the two take about the same steps ("casi empatan")', () => {
    const ratio = brutoOverAutomaton(raceAt(races, 6));
    expect(ratio).toBeGreaterThan(2 / 3);
    expect(ratio).toBeLessThan(3 / 2);
  });

  it('at 8, Bruto already takes several times the steps of the recipe', () => {
    expect(brutoOverAutomaton(raceAt(races, 8))).toBeGreaterThan(3);
  });

  it('at 10, Bruto takes many more: the question after the races has him as its answer', () => {
    expect(brutoOverAutomaton(raceAt(races, 10))).toBeGreaterThan(20);
    const ask = level.flow.find((step) => step.step === 'ask');
    if (ask?.step !== 'ask') throw new Error('6.4 asks who took more steps');
    expect(ask.options.filter((option) => option.correct).map((option) => option.line)).toEqual([
      'ch6.4.sauce.07',
    ]);
  });
});
