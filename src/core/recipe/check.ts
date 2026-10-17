import {
  cardOf,
  placedCards,
  RECIPE_CASES,
  rightCardOf,
  type Recipe,
  type RecipeCardId,
  type RecipeCase,
} from './recipe';

/**
 * Why a recipe is wrong, at its first failing card: a distractor chosen (a wrong end included), or
 * a case left without its right card (`card` is then the card that is missing). Either way, the
 * case of the search it is about, so the game can recall the level that taught it.
 */
export interface RecipeFailure {
  readonly kind: 'distractor' | 'missing';
  readonly card: RecipeCardId;
  readonly case: RecipeCase;
}

/** What the check says of a recipe. */
export type RecipeVerdict =
  { readonly right: true } | { readonly right: false; readonly failure: RecipeFailure };

/**
 * Judges a recipe as written, without running it (plan 05, phase 2): some distractors would never
 * finish ("repeat until no sprout is left in the dark"), so no recipe is ever executed to be
 * judged. A recipe is right when every case has its right card and no distractor is chosen. The
 * cases are read in their order (`RECIPE_CASES`): the start, the five cases of a vine, the end; in
 * each, a distractor fails before an absence, so a wrong card beside the right one is caught too.
 * The order of the case cards in the recipe plays no part: they are a set.
 */
export function checkRecipe(recipe: Recipe): RecipeVerdict {
  const chosen = placedCards(recipe).map(cardOf);
  for (const recipeCase of RECIPE_CASES) {
    const answers = chosen.filter((card) => card.case === recipeCase);
    const distractor = answers.find((card) => !card.right);
    if (distractor !== undefined) {
      return {
        right: false,
        failure: { kind: 'distractor', card: distractor.id, case: recipeCase },
      };
    }
    if (answers.length === 0) {
      const card = rightCardOf(recipeCase).id;
      return { right: false, failure: { kind: 'missing', card, case: recipeCase } };
    }
  }
  return { right: true };
}
