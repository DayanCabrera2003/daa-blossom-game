import notation from '@content/es/notation.json';
import { edmonds } from '@core/edmonds/solve';
import { size } from '@core/matching/queries';
import type { GardenState } from '@core/rules/state';
import { applyAction } from '@core/rules/applyAction';
import type { TraceEvent } from '@core/trace/events';
import { stateAt } from '@core/trace/replay';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import type { TeacherFeed } from '@services/busEvents';
import { describe, expect, it } from 'vitest';
import { snapshotOf } from './gardenSnapshot';
import { dayMoment, edmondsMoment, teacherTrace } from './teacherTrace';

const levelById = (id: string): Level => {
  const level = catalog().find((each) => each.data.id === id);
  if (level === undefined) throw new Error(`the catalog has ${id}`);
  return level;
};
const namesOf = (level: Level): string[] => level.data.sprouts.map((sprout) => sprout.label);

/** The feed of `level` after its reference solution, the sun at `cursor` (dusk by default). */
function playedFeed(level: Level, cursor?: number): TeacherFeed {
  const day: GardenState[] = [level.start];
  const events: (readonly TraceEvent[])[] = [[]];
  for (const move of level.solution) {
    const outcome = applyAction(day[day.length - 1] ?? level.start, move);
    if (!outcome.ok) break;
    day.push(outcome.state);
    events.push(outcome.events);
  }
  return { level: level.data.id, day, events, cursor: cursor ?? day.length - 1 };
}

describe("the model of the teacher's panel", () => {
  it('writes the day one step per garden after dawn, with the sun on the step shown', () => {
    const level = levelById('1.3');
    const trace = teacherTrace(playedFeed(level), namesOf(level), notation);
    expect(trace.day.map((step) => step.step)).toEqual([1]);
    expect(trace.day[0]?.lines.some((line) => line.includes('M\\leftarrow M\\oplus E(P)'))).toBe(
      true,
    );
    expect(trace.dayStep).toBe(1);
  });

  it('runs Edmonds from the lanterns of the garden the sun shows', () => {
    const level = levelById('1.3');
    const atDawn = teacherTrace(playedFeed(level, 0), namesOf(level), notation);
    const run = edmonds(level.graph, level.start.matching);
    expect(atDawn.trace).toEqual(run.trace);
    expect(atDawn.start).toBe(level.start.matching);
    expect(atDawn.edmonds).toHaveLength(run.trace.length);
    expect(atDawn.size).toBe(size(run.matching));
  });

  it('shows the garden of a step of the day, and of a step of the run of Edmonds', () => {
    const level = levelById('4.6');
    const feed = playedFeed(level);
    expect(dayMoment(feed, 0).snapshot).toEqual(snapshotOf(level.start));
    expect(dayMoment(feed, 99).snapshot).toEqual(
      snapshotOf(feed.day[feed.day.length - 1] ?? level.start),
    );
    const trace = teacherTrace(playedFeed(level, 0), namesOf(level), notation);
    expect(edmondsMoment(trace, 3).snapshot).toEqual(stateAt(trace.start, trace.trace, 3));
    expect(edmondsMoment(trace, -1).snapshot).toEqual(stateAt(trace.start, trace.trace, 0));
    expect(edmondsMoment(trace, 1e6).snapshot).toEqual(
      stateAt(trace.start, trace.trace, trace.trace.length),
    );
  });

  it('closes with the certificate of the stones: U = I, and the bound is |M| on every level', () => {
    for (const level of catalog()) {
      const trace = teacherTrace(playedFeed(level, 0), namesOf(level), notation);
      expect(trace.bound, level.data.id).toBe(trace.size);
      expect(trace.certificate).toHaveLength(4);
      expect(trace.certificate[3]).toContain(`\\nu(G)=${trace.size}`);
    }
  });
});
