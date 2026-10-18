import type { GardenState } from '@core/rules/state';
import { autoSearch } from '@core/search/autoSearch';
import { playDay, type PlayedDay } from './playedDay';

/**
 * The day the light makes when it searches by itself (4.1, 4.2): the garden `from`, then the
 * garden after each of the light's moves (`autoSearch` of the core), in order, with the events of
 * each. The rules make every state, so what the scene shows one by one is exactly what the session
 * keeps in its day.
 */
export const lightRun = (from: GardenState): PlayedDay =>
  playDay(from, autoSearch(from.layer, from.search, from.roots), "the light's own search");

/** The gardens of the light's day, dawn first. */
export const lightDay = (from: GardenState): readonly GardenState[] => lightRun(from).states;
