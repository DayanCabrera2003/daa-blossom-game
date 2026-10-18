import { runOf, type RaceResult } from '@core/cost/benchmark';
import type { Translate } from '@services/i18n';

/**
 * What the chart of C11 says of the last race shown (plan 07, phase 5): the size of its garden,
 * the steps of the mechanical gardener, and Bruto's, or that he fell asleep before the end.
 */
export function chartWords(race: RaceResult, t: Translate): string {
  const bruto = runOf(race, 'bruto');
  const steps = runOf(race, 'automaton').steps;
  return bruto.asleep
    ? t('diagram.chart.asleep', { n: race.n, steps })
    : t('diagram.chart.race', { n: race.n, steps, bruto: bruto.steps });
}

/**
 * The sizes along the bottom that get a number: each one at least `gap` pixels after the last one
 * numbered, so the numbers of small gardens close together never run into each other.
 */
export function numberedSizes<T extends { readonly x: number }>(
  sizes: readonly T[],
  gap: number,
): T[] {
  const kept: T[] = [];
  for (const size of sizes) {
    const before = kept.at(-1);
    if (before === undefined || size.x - before.x >= gap) kept.push(size);
  }
  return kept;
}
