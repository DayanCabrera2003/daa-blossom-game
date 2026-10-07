import { checkRecipe, type RecipeVerdict } from '@core/recipe/check';
import {
  EMPTY_RECIPE,
  placeCard,
  RIGHT_RECIPE,
  rightCardOf,
  takeCard,
  toggleCard,
  withoutCases,
  type Recipe,
  type RecipeCardId,
  type RecipeCase,
} from '@core/recipe/recipe';

/**
 * The recipe on the table during a `recipe` step (GDD 6.1, 6.3): the cards placed so far, the
 * checks made and what the last one said. Pure: the session keeps it, the panel paints it, and the
 * core judges it (`checkRecipe`); nothing here decides whether a recipe is right.
 */
export interface RecipeBoard {
  /** The index of the `recipe` step it belongs to, so a later recipe step starts afresh. */
  readonly step: number;
  readonly recipe: Recipe;
  /** Checks made so far in this step. */
  readonly checks: number;
  /** What the last check said, until the recipe changes; null before a check or after a touch. */
  readonly verdict: RecipeVerdict | null;
}

/**
 * The table as the step `step` opens: no card placed (6.1), or the right recipe without the cards
 * of the `missing` cases, to be repaired (6.3).
 */
export const startBoard = (step: number, missing: readonly RecipeCase[]): RecipeBoard => ({
  step,
  recipe: missing.length === 0 ? EMPTY_RECIPE : withoutCases(RIGHT_RECIPE, missing),
  checks: 0,
  verdict: null,
});

/** A touch on a card: into its slot, or back to the table; the last verdict no longer applies. */
export const touchCard = (board: RecipeBoard, card: RecipeCardId): RecipeBoard => ({
  ...board,
  recipe: toggleCard(board.recipe, card),
  verdict: null,
});

/** "Comprobar": the core judges the recipe as it stands, without running it. */
export function checkBoard(board: RecipeBoard): { board: RecipeBoard; verdict: RecipeVerdict } {
  const verdict = checkRecipe(board.recipe);
  return { board: { ...board, checks: board.checks + 1, verdict }, verdict };
}

/**
 * The right card the mentor places at grade 3 (GDD §5.3, the first step done for the player): the
 * right card of the first case the check fails at, taking back any distractor of that case. Null
 * when the recipe is already right. The player still checks it.
 */
export function mentorFix(recipe: Recipe): { card: RecipeCardId; recipe: Recipe } | null {
  const verdict = checkRecipe(recipe);
  if (verdict.right) return null;
  const { failure } = verdict;
  const card = rightCardOf(failure.case).id;
  const cleared = failure.kind === 'distractor' ? takeCard(recipe, failure.card) : recipe;
  return { card, recipe: placeCard(cleared, card) };
}
