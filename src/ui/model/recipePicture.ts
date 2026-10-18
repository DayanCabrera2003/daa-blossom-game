import { placedCards, rightCardOf, RIGHT_RECIPE, type RecipeCardId } from '@core/recipe/recipe';
import { runRecipe } from '@core/recipe/run';
import { runCases } from '@core/recipe/runCases';
import { ok, type Result } from '@core/shared/result';
import { demoStart } from '@levels/demoStart';
import type { DiagramGarden } from './diagramGarden';
import { replaySteps, type ReplayError, type ReplayStep } from './diagramReplay';

/**
 * The recipe of C10 card by card (plan 07, phase 5; level 6.2): the day of the mechanical gardener
 * following the right recipe, as the sun replays it, and at each step the card it is following,
 * which the page shows lit. Which case each move answers is the core's (`runCases`); the card is
 * the right one of that case.
 */

/** A step of the gardener's day, and the card it follows (none at dawn). */
export interface RecipeStep extends ReplayStep {
  readonly card: RecipeCardId | null;
}

/** The cards of the right recipe, in its order: the start, the cases, the end. */
export const recipeCards = (): RecipeCardId[] => placedCards(RIGHT_RECIPE);

/** The gardener's day in `garden`, each step with its card. */
export function recipeDay(garden: DiagramGarden): Result<RecipeStep[], ReplayError> {
  const steps = replaySteps(garden, 'recipe');
  if (!steps.ok) return steps;
  // The run the day was played from, as `replaySteps` plays it.
  const from = demoStart(garden.start);
  const cases = runCases(from, runRecipe(from, { fold: true }));
  return ok(
    steps.value.map((step, k) => {
      const answered = k === 0 ? undefined : cases[k - 1];
      return { ...step, card: answered === undefined ? null : rightCardOf(answered).id };
    }),
  );
}
