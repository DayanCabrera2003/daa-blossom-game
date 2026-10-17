import type { RecipeFailure } from '@core/recipe/check';
import type { RecipeCardId, RecipeCase } from '@core/recipe/recipe';

/**
 * The recipe cards as content (GDD 6.1): the text of each card, what the mentor says when a check
 * fails at it, and the level that taught each case, for "esto lo hiciste en 3.4". The core knows
 * the cases of the search; which level taught them belongs to the levels.
 */

/**
 * The level where the player first did what each case asks (GDD chapters 3 and 4): every lonely
 * sprout throws its light (3.4); the lonely moon ends in a chain, and a lit sprout becomes a moon
 * with its partner a sun (3.1); a moon needs no second path (3.3); two suns of different trees
 * meet in a chain from root to root (3.4); two suns of one tree fold into a flower (4.4); the
 * search ends with no chain and keeps its moons (3.6).
 */
export const TAUGHT_IN: Readonly<Record<RecipeCase, string>> = {
  start: '3.4',
  dark: '3.1',
  lit: '3.1',
  otherTree: '3.4',
  sameTree: '4.4',
  moon: '3.3',
  end: '3.6',
};

/** The level that taught the case a check failed at. */
export const taughtIn = (failure: RecipeFailure): string => TAUGHT_IN[failure.case];

/** The interface text of a card. */
export const cardTextKey = (card: RecipeCardId): string => `recipe.card.${card}`;

/**
 * What the mentor says of a failed check: why a distractor is wrong (each has its own text), or
 * which case is left unanswered.
 */
export const failureTextKey = (failure: RecipeFailure): string =>
  failure.kind === 'distractor' ? `recipe.wrong.${failure.card}` : `recipe.missing.${failure.case}`;

/** "Esto lo hiciste en {level}.", said after every failed check. */
export const RECALL_KEY = 'recipe.recall';
