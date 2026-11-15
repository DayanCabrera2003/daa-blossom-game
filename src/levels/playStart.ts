import { RIGHT_RECIPE, withoutCases } from '@core/recipe/recipe';
import { runOptionsOf, runRecipe } from '@core/recipe/run';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { autoSearch } from '@core/search/autoSearch';
import type { Level } from './build';

/** Plays moves from a garden while the rules accept them; a refusal leaves the garden before it. */
function playWhileAccepted(from: GardenState, moves: readonly Action[]): GardenState {
  let state = from;
  for (const move of moves) {
    const outcome = applyAction(state, move);
    if (!outcome.ok) return state;
    state = outcome.state;
  }
  return state;
}

/**
 * The garden the step `index` of a level's script starts from, when no play step comes before it:
 * the level's start, after whatever the garden does by itself in the steps before it, as the game
 * plays them. The light's own search (4.1, 4.2) adds its marks to the garden; the automaton's run
 * (6.2, 7.4) is a new day from the starting lanterns, and its marks stay ("Terminé" keeps the
 * moons). A move the level's rules refuse stops there: the script checks report it
 * (`flowChecks.ts`). The player's own moves in a play step are not foreseen, so the walk stops at
 * the first one.
 */
export function gardenBefore(level: Level, index: number): GardenState {
  const { start } = level;
  let garden = start;
  for (const step of level.flow.slice(0, index)) {
    if (step.step === 'play') break;
    if (step.step === 'autoSearch') {
      garden = playWhileAccepted(garden, autoSearch(garden.layer, garden.search, garden.roots));
    }
    if (step.step === 'automaton') {
      // Without `missing`, the player's recipe runs, which a recipe step lets pass only when right.
      const options = runOptionsOf(withoutCases(RIGHT_RECIPE, step.missing ?? []));
      if (options !== null) garden = playWhileAccepted(start, runRecipe(start, options));
    }
  }
  return garden;
}

/** The garden the first play step of a level starts from (`gardenBefore` the whole script). */
export const gardenAtPlay = (level: Level): GardenState => gardenBefore(level, level.flow.length);
