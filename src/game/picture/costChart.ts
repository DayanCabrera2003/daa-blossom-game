import { runOf, type RaceResult } from '@core/cost/benchmark';

/**
 * The chart of the races (GDD 6.5): steps against the size of the garden, one dot per race seen,
 * drawn point by point as the races end. Every number comes from the core's races; nothing is
 * invented for the chart. The automaton's curve rises gently and stays inside; Bruto's leaves the
 * chart through the top, and once he falls asleep his dot is marked so, never placed at the budget
 * he ran out of, which is no result of his.
 */

/** The box the chart is drawn in, in canvas pixels; y grows downwards, as on screen. */
export interface ChartBox {
  readonly width: number;
  readonly height: number;
}

/** A dot of the chart: the size of its garden, and where it sits in the box. */
export interface ChartDot {
  readonly n: number;
  readonly x: number;
  readonly y: number;
}

/**
 * A dot of Bruto: at the height of his steps (`shown`), or on the top edge when they do not fit
 * (`above`) or when he fell asleep (`asleep`).
 */
export interface BrutoDot extends ChartDot {
  readonly mark: 'shown' | 'above' | 'asleep';
}

/** Everything the chart shows at one moment. */
export interface CostChart {
  readonly automaton: readonly ChartDot[];
  readonly bruto: readonly BrutoDot[];
  /** The steps at the top edge: the most the automaton takes in the level's races, with room. */
  readonly top: number;
  /** Where the size of each race stands along the bottom, seen or not yet. */
  readonly sizes: readonly { readonly n: number; readonly x: number }[];
}

/** Room above the automaton's highest dot, so it never touches the top edge. */
const HEADROOM = 1.25;

/**
 * The chart of a level's `races`, all of them in order, with the first `shown` drawn. The scale is
 * fixed by all the races, seen or not, so the chart never rescales while its dots appear.
 */
export function costChart(races: readonly RaceResult[], shown: number, box: ChartBox): CostChart {
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
