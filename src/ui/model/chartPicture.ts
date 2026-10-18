import { runOf, type RaceResult } from '@core/cost/benchmark';
import type { Level } from '@levels/build';
import { racesOf } from '@levels/races';

/**
 * The chart of the races of C11 (plan 07, phase 5; levels 6.4 and 6.5): steps against the size of
 * the garden, a dot per race shown, the same races the player watched, recomputed with the same
 * families and seeds (`levels/races.ts`). The geometry is the game's chart's (`costChart`, which
 * the books may not import; `tests/chartPicture.test.ts` holds the two to the same dots): the
 * mechanical gardener's curve stays inside, Bruto's leaves through the top, and once he falls
 * asleep his dot says so instead of standing at the budget he ran out of.
 */

/** The box the chart is drawn in, in pixels of the picture; y grows downwards. */
export interface ChartBox {
  readonly width: number;
  readonly height: number;
}

/** A dot: the size of its garden, and where it sits in the box. */
export interface ChartDot {
  readonly n: number;
  readonly x: number;
  readonly y: number;
}

/** A dot of Bruto: at his steps, or on the top edge when they do not fit or he fell asleep. */
export interface BrutoDot extends ChartDot {
  readonly mark: 'shown' | 'above' | 'asleep';
}

/** Everything the chart shows with some races drawn. */
export interface ChartPicture {
  readonly automaton: readonly ChartDot[];
  readonly bruto: readonly BrutoDot[];
  /** The steps at the top edge: the most the gardener takes in these races, with room. */
  readonly top: number;
  /** Where the size of each race stands along the bottom, shown or not yet. */
  readonly sizes: readonly { readonly n: number; readonly x: number }[];
}

/** Room above the gardener's highest dot, so it never touches the top edge. */
const HEADROOM = 1.25;

/**
 * The chart of `races`, in order, with the first `shown` drawn. The scale is fixed by all of them,
 * shown or not, so the chart never rescales while its dots appear.
 */
export function chartPicture(
  races: readonly RaceResult[],
  shown: number,
  box: ChartBox,
): ChartPicture {
  const widest = Math.max(1, ...races.map((race) => race.n));
  const top = Math.max(1, Math.ceil(HEADROOM * Math.max(0, ...races.map((r) => r.didacticSteps))));
  const x = (n: number): number => (n / widest) * box.width;
  const y = (steps: number): number => box.height - (steps / top) * box.height;
  const seen = races.slice(0, shown);
  return {
    automaton: seen.map((race) => ({ n: race.n, x: x(race.n), y: y(race.didacticSteps) })),
    bruto: seen.map((race): BrutoDot => {
      const run = runOf(race, 'bruto');
      const at = { n: race.n, x: x(race.n) };
      if (run.asleep) return { ...at, y: 0, mark: 'asleep' };
      return run.steps > top
        ? { ...at, y: 0, mark: 'above' }
        : { ...at, y: y(run.steps), mark: 'shown' };
    }),
    top,
    sizes: races.map((race) => ({ n: race.n, x: x(race.n) })),
  };
}

/**
 * The races the scripts of `levels` run, in order, each garden once (6.5 runs again the garden of
 * 8 sprouts that 6.4 ran), smallest first.
 */
export function chartRaces(levels: readonly Level[]): RaceResult[] {
  const seen = new Map<string, RaceResult>();
  for (const level of levels) {
    for (const { race, result } of racesOf(level.flow)) {
      seen.set(JSON.stringify([race.family, race.size, race.seed, race.budget]), result);
    }
  }
  return [...seen.values()].sort((a, b) => a.n - b.n);
}
