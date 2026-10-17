import type { RaceResult } from '@core/cost/benchmark';
import { describe, expect, it } from 'vitest';
import { costChart } from './costChart';

/** A race of `n` sprouts: the automaton's steps, and Bruto's (null: he fell asleep at 9,999). */
const raced = (n: number, automaton: number, bruto: number | null): RaceResult => ({
  n,
  edges: 0,
  lanterns: 0,
  didacticSteps: automaton,
  fastOperations: 0,
  bruto: bruto === null ? { status: 'gaveUp', steps: 9_999 } : { status: 'complete', steps: bruto },
});

const box = { width: 100, height: 50 };
const races = [raced(8, 40, 30), raced(16, 160, 900), raced(32, 640, null)];

describe('the cost chart of the races (6.5)', () => {
  it('scales to the most steps the automaton takes in all the level’s races, with room above', () => {
    // So the chart never rescales as its points are drawn one by one.
    expect(costChart(races, 1, box).top).toBe(800);
    expect(costChart(races, 3, box).top).toBe(800);
  });

  it('puts every race at its size along the bottom, the biggest at the right edge', () => {
    expect(costChart(races, 0, box).sizes).toEqual([
      { n: 8, x: 25 },
      { n: 16, x: 50 },
      { n: 32, x: 100 },
    ]);
  });

  it('draws only the races seen so far, the automaton’s at the height of its steps', () => {
    const chart = costChart(races, 2, box);
    expect(chart.automaton).toEqual([
      { n: 8, x: 25, y: 47.5 },
      { n: 16, x: 50, y: 40 },
    ]);
    expect(costChart(races, 0, box).automaton).toEqual([]);
  });

  it('marks Bruto above the chart when he takes more steps, and asleep, never at his budget', () => {
    const chart = costChart(races, 3, box);
    expect(chart.bruto).toEqual([
      { n: 8, x: 25, y: 48.125, mark: 'shown' },
      { n: 16, x: 50, y: 0, mark: 'above' },
      { n: 32, x: 100, y: 0, mark: 'asleep' },
    ]);
  });

  it('has nothing to draw without races', () => {
    expect(costChart([], 0, box)).toEqual({ automaton: [], bruto: [], top: 1, sizes: [] });
  });
});
