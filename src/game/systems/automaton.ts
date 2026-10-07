import type { Recipe } from '@core/recipe/recipe';
import { runOptionsOf, runRecipe } from '@core/recipe/run';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';

/**
 * The day the mechanical gardener makes when it runs `recipe` (6.2, 6.3): the garden `from`, then
 * the garden after each move of its run (`runRecipe` of the core), in order. The rules make every
 * state, so what the scene shows one by one is exactly what the session keeps in its day, and the
 * sun walks it like any other.
 */
export function automatonDay(from: GardenState, recipe: Recipe): readonly GardenState[] {
  const options = runOptionsOf(recipe);
  // A recipe step ends only on a right recipe, and level integrity checks the fixed ones.
  invariant(options !== null, 'the automaton runs only a recipe it can run');
  let state = from;
  const day = [state];
  for (const move of runRecipe(from, options)) {
    const outcome = applyAction(state, move);
    // Level integrity plays the run with the level's rules, so a refusal is a broken catalog.
    invariant(outcome.ok, "the rules accept every move of the automaton's run");
    state = outcome.state;
    day.push(state);
  }
  return day;
}
