import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import type { RaceResult } from '@core/cost/benchmark';
import { createTranslator } from '@services/i18n';
import { chartWords, numberedSizes, raceCount } from './chartWords';

const t = createTranslator(strings);

const race = (n: number, bruto: RaceResult['bruto']): RaceResult => ({
  n,
  edges: n,
  lanterns: n / 2,
  didacticSteps: 10 * n,
  fastOperations: n,
  bruto,
});

describe('the words of the chart of C11', () => {
  it('tells the steps of both runners, or that Bruto fell asleep', () => {
    expect(chartWords(race(6, { status: 'complete', steps: 90 }), t)).toBe(
      t('diagram.chart.race', { n: 6, steps: 60, bruto: 90 }),
    );
    expect(chartWords(race(64, { status: 'gaveUp', steps: 1000000 }), t)).toBe(
      t('diagram.chart.asleep', { n: 64, steps: 640 }),
    );
    expect(t('diagram.chart.asleep', { n: 64, steps: 640 })).toMatch(/64/);
  });

  it('says beside the controls which race is shown, of how many, and the size of its garden', () => {
    const races = [6, 8, 10].map((n) => race(n, { status: 'complete', steps: n }));
    expect(raceCount(races, 1, t)).toBe('Carrera 1 de 3 — 6 brotes');
    expect(raceCount(races, 3, t)).toBe('Carrera 3 de 3 — 10 brotes');
  });

  it('numbers the sizes far enough apart, skipping those too close to the last one numbered', () => {
    const sizes = [6, 8, 10, 16, 32].map((n) => ({ n, x: n * 2 }));
    expect(numberedSizes(sizes, 14).map((size) => size.n)).toEqual([6, 16, 32]);
    expect(numberedSizes([], 14)).toEqual([]);
  });
});
