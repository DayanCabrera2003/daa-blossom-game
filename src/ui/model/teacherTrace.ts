import { oddComponents } from '@core/certificates/oddComponents';
import { stonesFromForest } from '@core/certificates/fromForest';
import { tutteBergeBound } from '@core/certificates/tutteBerge';
import { edmonds } from '@core/edmonds/solve';
import { size } from '@core/matching/queries';
import type { Matching } from '@core/matching/types';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { TraceEvent } from '@core/trace/events';
import { stateAt } from '@core/trace/replay';
import type { TeacherFeed } from '@services/busEvents';
import { snapshotOf } from './gardenSnapshot';
import type { MiniMoment } from './miniGarden';
import { texSet } from './texName';
import {
  eventTex,
  fillNotation,
  traceLines,
  type Notation,
  type NotationLine,
} from './traceNotation';

/**
 * The model of the teacher's panel beside the garden (GDD §5.8; plan 07, phase 12): two traces in
 * the notation of the Codex. "Your day" is the player's, a step per garden of the level's history,
 * written from the events the rules answered, with the sun on the step the garden shows.
 * "Edmonds from here" is a run of the core's algorithm from the lanterns of that garden, every
 * event a line, closed by the certificate its failed search hands over (Theorem 12.3): the moons
 * as the set $U=I$, the odd groups of $G-U$ and the bound, which equals $\lvert M\rvert$. Nothing
 * is computed here that the core does not answer; this module only arranges it.
 */

/** A step of the player's day: the garden it leads to (1 after the first move) and its lines. */
export interface DayStep {
  readonly step: number;
  readonly lines: readonly string[];
}

/** Everything the panel writes for one feed. */
export interface TeacherTrace {
  /** The player's day, a step per garden after dawn. */
  readonly day: readonly DayStep[];
  /** The step the sun shows (0 at dawn). */
  readonly dayStep: number;
  /** Where the run of Edmonds starts: the lanterns of the garden the sun shows. */
  readonly start: Matching;
  /** The run, every event, and each as a line of TeX. */
  readonly trace: readonly TraceEvent[];
  readonly edmonds: readonly NotationLine[];
  /** The lanterns at its end, and the bound its stones prove. */
  readonly size: number;
  readonly bound: number;
  /** The certificate's lines of TeX: U = I, the counts, the bound, and ν(G). */
  readonly certificate: readonly string[];
}

/** The panel's two traces for `feed`, sprouts named by `names`, in the templates of `notation`. */
export function teacherTrace(
  feed: TeacherFeed,
  names: readonly string[],
  notation: Notation,
): TeacherTrace {
  const shown = itemAt(feed.day, feed.cursor);
  const run = edmonds(shown.graph, shown.matching);
  const stones = stonesFromForest(run.finalLayer, run.finalForest);
  const n = shown.graph.n;
  const groups = oddComponents(shown.graph, stones).length;
  const bound = tutteBergeBound(shown.graph, stones);
  const lanterns = size(run.matching);
  const counts = { n, stones: stones.length, groups };
  return {
    day: feed.events.slice(1).map((events, k) => ({
      step: k + 1,
      lines: events.map((event) => eventTex(event, names, notation)),
    })),
    dayStep: feed.cursor,
    start: shown.matching,
    trace: run.trace,
    edmonds: traceLines(run.trace, names, notation),
    size: lanterns,
    bound,
    certificate: [
      fillNotation(notation, 'certificate.stones', { set: texSet(names, stones) }),
      fillNotation(notation, 'certificate.count', counts),
      fillNotation(notation, 'certificate.bound', { ...counts, bound }),
      fillNotation(notation, 'certificate.tight', { size: lanterns, bound }),
    ],
  };
}

/**
 * The lines of the run of Edmonds the panel lists: all of them, or, with `scans` off, all but the
 * vines examined (`scanEdge`, the lines that count the cost), each line keeping its step.
 */
export const edmondsRows = (trace: TeacherTrace, scans: boolean): readonly NotationLine[] =>
  scans ? trace.edmonds : trace.edmonds.filter((line) => line.type !== 'scanEdge');

/** A garden of the rules as a small garden draws it. */
const momentOf = (state: GardenState): MiniMoment => ({
  snapshot: snapshotOf(state),
  scarecrows: state.scarecrows,
  stones: state.stones,
});

/** The garden of step `step` of the player's day, kept inside the day. */
export const dayMoment = (feed: TeacherFeed, step: number): MiniMoment =>
  momentOf(itemAt(feed.day, Math.max(0, Math.min(feed.day.length - 1, step))));

/** The garden after the first `k` events of the run of Edmonds, kept inside the run. */
export const edmondsMoment = (trace: TeacherTrace, k: number): MiniMoment => ({
  snapshot: stateAt(trace.start, trace.trace, Math.max(0, Math.min(trace.trace.length, k))),
  scarecrows: [],
  stones: [],
});
