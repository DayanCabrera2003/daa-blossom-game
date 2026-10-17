import { race, runOf, type RaceResult } from '@core/cost/benchmark';
import { doublingAnswer, type DoublingVerdict } from '@core/cost/doubling';
import { raceGarden } from '@core/generators/raceGarden';
import type { LevelStep } from './flow';

/**
 * The races of a level script (6.4, 6.5), as the core runs them: the garden a race step names,
 * grown from its family and seed, raced by the automaton and by Bruto with the step's budget. The
 * steps on the counters, the points of the chart and the right answer of every doubling bet all
 * come from here, never from the level file.
 */

/** A race step of a script. */
export type RaceStep = Extract<LevelStep, { step: 'race' }>;

/** What names a race: the garden and Bruto's budget. */
export type RaceSpec = Pick<RaceStep, 'family' | 'size' | 'seed' | 'budget'>;

/**
 * Races already run, by what names them. A race is a pure function of its spec, so it is run once:
 * the level screen asks for it every frame, and Bruto may take a million steps.
 */
const raced = new Map<string, RaceResult>();

/** The race a step names. */
export function raceOf(spec: RaceSpec): RaceResult {
  const key = JSON.stringify([spec.family, spec.size, spec.seed, spec.budget]);
  const known = raced.get(key);
  if (known !== undefined) return known;
  const result = race(raceGarden(spec.family, spec.size, spec.seed), spec.budget);
  raced.set(key, result);
  return result;
}

/** One race of a script: the index of its step, the step, and how it went. */
export interface ScriptRace {
  readonly step: number;
  readonly race: RaceStep;
  readonly result: RaceResult;
}

/** Every race of a script, in the order they are run. */
export const racesOf = (steps: readonly LevelStep[]): ScriptRace[] =>
  steps.flatMap((step, index) =>
    step.step === 'race' ? [{ step: index, race: step, result: raceOf(step) }] : [],
  );

/** The steps of the races a bet at `index` stands between: the last before it, the first after. */
export function racesAround(
  steps: readonly LevelStep[],
  index: number,
): { readonly before: number | null; readonly after: number | null } {
  const kinds = steps.map((step) => step.step);
  const before = kinds.slice(0, index).lastIndexOf('race');
  const after = kinds.indexOf('race', index + 1);
  return { before: before === -1 ? null : before, after: after === -1 ? null : after };
}

/**
 * The right answer of the doubling bet at `index`: how many more steps its runner took in the race
 * after it than in the race before it. Null when the step is no bet or lacks a race on either side,
 * which the level checks keep out of every level.
 */
export function raceBetVerdict(steps: readonly LevelStep[], index: number): DoublingVerdict | null {
  const bet = steps[index];
  if (bet?.step !== 'raceBet') return null;
  const { before, after } = racesAround(steps, index);
  const [small, large] = [before, after].map((at) => (at === null ? undefined : steps[at]));
  if (small?.step !== 'race' || large?.step !== 'race') return null;
  return doublingAnswer(runOf(raceOf(small), bet.runner), runOf(raceOf(large), bet.runner));
}
