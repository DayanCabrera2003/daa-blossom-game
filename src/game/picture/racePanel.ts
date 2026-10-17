import { runOf } from '@core/cost/benchmark';
import { racesOf } from '@levels/races';
import { isFinished } from '../systems/flow';
import { stepNow, type LevelSession } from '../systems/levelSession';
import { costChart, type ChartBox, type CostChart } from './costChart';
import { counterAt, raceDuration, type CounterPicture } from './raceClock';
import { miniatureOf, type Box, type Miniature } from './raceMiniature';

/**
 * The race panel of the level screen (GDD 6.4, 6.5): the garden of the race zoomed out, a counter
 * for each runner and the chart of every race seen so far. During a race step it shows that race,
 * its counters on the clock of the race on screen; between races (the lines, the bets) it keeps
 * the last one in view, over, so the bets are made looking at it. Pure.
 */

/** Where the panel draws the zoomed-out garden and the chart. */
export interface RaceLayout {
  readonly miniature: Box;
  readonly chart: ChartBox;
}

/** The race on screen: the index of its step, and the milliseconds since it started. */
export interface RaceClock {
  readonly step: number;
  readonly elapsed: number;
}

/** Everything the race panel shows at one moment. */
export interface RacePanelPicture {
  /** The index of the race step shown, in the script. */
  readonly step: number;
  /** The sprouts of its garden. */
  readonly size: number;
  readonly miniature: Miniature;
  readonly automaton: CounterPicture;
  readonly bruto: CounterPicture;
  readonly chart: CostChart;
}

/**
 * The race panel of the session now; null when no race has come yet or the script is over. `clock`
 * is the race the scene is showing, if any: a race step not yet started stands at its start.
 */
export function racePicture(
  session: LevelSession,
  clock: RaceClock | null,
  layout: RaceLayout,
): RacePanelPicture | null {
  const { flow } = session;
  if (isFinished(flow)) return null;
  const races = racesOf(flow.steps);
  // The race of the step now, or else the last one before it, over.
  const now = stepNow(session)?.step === 'race';
  const index =
    races.filter((race) => (now ? race.step <= flow.index : race.step < flow.index)).length - 1;
  const shown = races[index];
  if (shown === undefined) return null;
  const elapsed = !now ? Infinity : clock?.step === shown.step ? clock.elapsed : 0;
  const runs = [runOf(shown.result, 'automaton'), runOf(shown.result, 'bruto')] as const;
  const over = elapsed >= raceDuration(runs);
  return {
    step: shown.step,
    size: shown.race.size,
    miniature: miniatureOf(shown.race, layout.miniature),
    automaton: counterAt(runs[0], elapsed),
    bruto: counterAt(runs[1], elapsed),
    chart: costChart(
      races.map((race) => race.result),
      index + (over ? 1 : 0),
      layout.chart,
    ),
  };
}
