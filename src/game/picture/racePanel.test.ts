import { describe, expect, it } from 'vitest';
import { racesLevel } from '../../../tests/support/fixtureLevels';
import { openSession, respond, type LevelSession } from '../systems/levelSession';
import { raceDuration } from './raceClock';
import { raceDurationAt, racePicture, type RaceLayout } from './racePanel';

const layout: RaceLayout = {
  miniature: { x: 0, y: 0, width: 80, height: 80 },
  chart: { width: 100, height: 50 },
};

// A race at 8 sprouts (the automaton 41 steps, Bruto 224), two bets, a race at 16 (Bruto sleeps).
const level = racesLevel();
const opened = openSession(level, 0).session;
const afterFirst = respond(opened, { type: 'raced' }, 0).session;
const betsDone = [1, 2].reduce(
  (session: LevelSession, option) => respond(session, { type: 'answer', option }, 0).session,
  afterFirst,
);

describe('the race panel (6.4, 6.5)', () => {
  it('shows the race of the step now, its counters at the start until it begins', () => {
    const picture = racePicture(opened, null, layout);
    expect(picture).toMatchObject({
      step: 0,
      size: 8,
      automaton: { steps: 0, finished: false },
      bruto: { steps: 0, finished: false },
    });
    expect(picture?.miniature.sprouts).toHaveLength(8);
    expect(picture?.chart.automaton).toEqual([]);
  });

  it('runs the counters on the clock of the race on screen; its dot appears once it is over', () => {
    const during = racePicture(opened, { step: 0, elapsed: 1_000 }, layout);
    expect(during?.automaton.finished).toBe(false);
    const duration = raceDuration([
      { steps: 41, asleep: false },
      { steps: 224, asleep: false },
    ]);
    const over = racePicture(opened, { step: 0, elapsed: duration }, layout);
    expect(over).toMatchObject({
      automaton: { steps: 41, finished: true },
      bruto: { steps: 224, finished: true },
    });
    expect(over?.chart.automaton).toHaveLength(1);
  });

  it('keeps the last race in view, over and on the chart, while the bets are asked', () => {
    const picture = racePicture(afterFirst, null, layout);
    expect(picture).toMatchObject({ step: 0, automaton: { steps: 41, finished: true } });
    expect(picture?.chart.automaton).toHaveLength(1);
    expect(picture?.chart.sizes.map((size) => size.n)).toEqual([8, 16]);
  });

  it('a clock of another race is not the clock of the race shown', () => {
    const picture = racePicture(betsDone, { step: 0, elapsed: 99_999 }, layout);
    expect(picture).toMatchObject({ step: 3, size: 16, bruto: { steps: 0, asleep: false } });
  });

  it('shows Bruto asleep at the end of a race he could not finish', () => {
    const picture = racePicture(betsDone, { step: 3, elapsed: Infinity }, layout);
    expect(picture?.bruto).toEqual({ steps: 1_000, finished: false, asleep: true });
    expect(picture?.chart.bruto.map((dot) => dot.mark)).toEqual(['shown', 'asleep']);
  });

  it('lasts on screen as long as the clock takes to stop its slower runner', () => {
    const runs = [
      { steps: 41, asleep: false },
      { steps: 224, asleep: false },
    ];
    expect(raceDurationAt(level.flow, 0)).toBe(raceDuration(runs));
    expect(raceDurationAt(level.flow, 1)).toBe(0);
  });

  it('closes once the script is over', () => {
    const over = respond(betsDone, { type: 'raced' }, 0).session;
    expect(racePicture(over, null, layout)).toBeNull();
  });
});
