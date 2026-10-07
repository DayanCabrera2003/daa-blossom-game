import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { autoSearch } from '@core/search/autoSearch';
import { invariant } from '@core/shared/invariant';

/**
 * The day the light makes when it searches by itself (4.1, 4.2): the garden `from`, then the
 * garden after each of the light's moves (`autoSearch` of the core), in order. The rules make every
 * state, so what the scene shows one by one is exactly what the session keeps in its day.
 */
export function lightDay(from: GardenState): readonly GardenState[] {
  let state = from;
  const day = [state];
  for (const move of autoSearch(from.layer, from.search, from.roots)) {
    const outcome = applyAction(state, move);
    // Level integrity plays the light's search with the rules, so a refusal is a broken catalog.
    invariant(outcome.ok, "the rules accept every move of the light's own search");
    state = outcome.state;
    day.push(state);
  }
  return day;
}
