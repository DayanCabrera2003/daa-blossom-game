import type { Graph } from '../graph/types';
import { createRng } from '../shared/rng';
import { randomGraph } from './random';

/**
 * The gardens raced in chapter 6 (levels 6.4 and 6.5), grown from a family, a size and a seed, so
 * every play sees the very same races. A level names them; it never writes their vines by hand.
 * - `half`: every pair of sprouts shares a vine with probability ½, G(n, ½), the gardens of the
 *   cost table of Códex C11 (`npm run bench`).
 */
export const RACE_FAMILIES = ['half'] as const;

/** A family of race gardens. */
export type RaceFamily = (typeof RACE_FAMILIES)[number];

/** The garden of `n` sprouts of a family, grown from `seed`. */
export function raceGarden(family: RaceFamily, n: number, seed: number): Graph {
  switch (family) {
    case 'half':
      return randomGraph(n, 0.5, createRng(seed));
  }
}
