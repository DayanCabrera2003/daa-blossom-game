import { describe, expect, it } from 'vitest';
import { costChart } from '@game/picture/costChart';
import { catalog } from '@levels/catalog';
import { chartPicture, chartRaces } from '@ui/model/chartPicture';

/**
 * The chart of the races in C11 (plan 07, phase 5) is drawn by the books, which may not import the
 * game, so its geometry is written again in `ui/model/chartPicture.ts`; here both are held to the
 * very same dots for the very same races, those of 6.4 and 6.5.
 */

const levels = catalog().filter((level) => ['6.4', '6.5'].includes(level.data.id));
const races = chartRaces(levels);

describe('the chart of the races of C11', () => {
  it('runs the races of 6.4 and 6.5 once each, smallest garden first', () => {
    expect(races.map((race) => race.n)).toEqual([6, 8, 10, 16, 32, 64]);
  });

  it('draws the same dots as the game chart, for every number of races shown', () => {
    const box = { width: 240, height: 100 };
    for (let shown = 0; shown <= races.length; shown++) {
      expect(chartPicture(races, shown, box)).toEqual(costChart(races, shown, box));
    }
  });

  it('keeps the gardener inside the chart and sends Bruto out through the top', () => {
    const picture = chartPicture(races, races.length, { width: 240, height: 100 });
    for (const dot of picture.automaton) expect(dot.y).toBeGreaterThan(0);
    expect(picture.bruto.at(-1)?.mark).not.toBe('shown');
  });
});
