import { invariant } from '../shared/invariant';

/**
 * The recipe (GDD 6.1, plan 05 phase 2): the search the player has run by hand since chapter 3,
 * written as cards for someone else to follow. A recipe has three slots: how the search starts
 * (`mark`), what to do with each case of a vine `sun–x` (`cases`), and when it is over (`end`).
 * The five cases exclude each other, so `cases` is a set: the order of its cards means nothing.
 *
 * Every card answers one case of the search. The right cards are the steps of Edmonds' search;
 * the distractors are tempting rules that answer a case wrongly (GDD 6.1). The core knows the
 * cases, never the levels that taught them: that is content, kept with the levels.
 */

/**
 * The cases a recipe must answer, in the order a recipe reads: the start, the five cases of a dark
 * vine from a sun to `x` (as `growStep` tells them apart), and the end.
 * - `start`: how the search begins (every dark sprout a sun);
 * - `dark`: x unmarked and in the dark (a chain);
 * - `lit`: x unmarked with a lantern (x a moon, its partner a sun);
 * - `otherTree`: x a sun of another tree (a chain from root to root);
 * - `sameTree`: x a sun of the same tree (fold the flower);
 * - `moon`: x a moon (nothing to do);
 * - `end`: nothing left to explore.
 */
export const RECIPE_CASES = [
  'start',
  'dark',
  'lit',
  'otherTree',
  'sameTree',
  'moon',
  'end',
] as const;

/** A case a recipe must answer. */
export type RecipeCase = (typeof RECIPE_CASES)[number];

/** The slots of a recipe. */
export type RecipeSlot = 'mark' | 'cases' | 'end';

/** The ids of every card, right ones first in the order of their cases, then the distractors. */
export const RECIPE_CARD_IDS = [
  'markDarkSuns',
  'chainToDark',
  'growMoon',
  'chainRootToRoot',
  'foldFlower',
  'moonNothing',
  'finishKeepMoons',
  'moonToSun',
  'foldAnyLoop',
  'untilNoneDark',
] as const;

/** The stable id of a card. */
export type RecipeCardId = (typeof RECIPE_CARD_IDS)[number];

/** One card: the case it answers, and whether it answers it right. */
export interface RecipeCard {
  readonly id: RecipeCardId;
  readonly case: RecipeCase;
  readonly right: boolean;
}

/**
 * Every card. The distractors are the GDD's: "if x is a moon, turn it into a sun" (a moon already
 * has its path, 3.3), "if there is a loop, fold" (an even loop never confuses, 4.3: only two suns
 * of one tree close a flower) and "repeat until no sprout is left in the dark", which may never end
 * (some sprout can stay in the dark for ever), so it is judged without being run.
 */
export const RECIPE_CARDS: readonly RecipeCard[] = [
  { id: 'markDarkSuns', case: 'start', right: true },
  { id: 'chainToDark', case: 'dark', right: true },
  { id: 'growMoon', case: 'lit', right: true },
  { id: 'chainRootToRoot', case: 'otherTree', right: true },
  { id: 'foldFlower', case: 'sameTree', right: true },
  { id: 'moonNothing', case: 'moon', right: true },
  { id: 'finishKeepMoons', case: 'end', right: true },
  { id: 'moonToSun', case: 'moon', right: false },
  { id: 'foldAnyLoop', case: 'sameTree', right: false },
  { id: 'untilNoneDark', case: 'end', right: false },
];

/** The card with this id. */
export function cardOf(id: RecipeCardId): RecipeCard {
  const card = RECIPE_CARDS.find((candidate) => candidate.id === id);
  invariant(card !== undefined, `every card id is listed, ${id} is not`);
  return card;
}

/** The right card of a case. */
export function rightCardOf(recipeCase: RecipeCase): RecipeCard {
  const card = RECIPE_CARDS.find((candidate) => candidate.case === recipeCase && candidate.right);
  invariant(card !== undefined, `every case has a right card, ${recipeCase} has none`);
  return card;
}

/** The slot of the cards of a case: the start and the end have their own, the rest are cases. */
export const slotOf = (recipeCase: RecipeCase): RecipeSlot =>
  recipeCase === 'start' ? 'mark' : recipeCase === 'end' ? 'end' : 'cases';

/** A recipe: one card (or none yet) to start and to end, and a set of case cards. */
export interface Recipe {
  readonly mark: RecipeCardId | null;
  /** A set: no card twice, and its order means nothing. */
  readonly cases: readonly RecipeCardId[];
  readonly end: RecipeCardId | null;
}

/** A recipe with no card yet (6.1). */
export const EMPTY_RECIPE: Recipe = { mark: null, cases: [], end: null };

/** The right recipe of the GDD: every right card in its slot. */
export const RIGHT_RECIPE: Recipe = {
  mark: 'markDarkSuns',
  cases: RECIPE_CARDS.filter((card) => card.right && slotOf(card.case) === 'cases').map(
    (card) => card.id,
  ),
  end: 'finishKeepMoons',
};

/** The cards of a recipe: the mark first, then the cases, then the end. */
export const placedCards = (recipe: Recipe): RecipeCardId[] => [
  ...(recipe.mark === null ? [] : [recipe.mark]),
  ...recipe.cases,
  ...(recipe.end === null ? [] : [recipe.end]),
];

/** Whether a card is in the recipe. */
export const isPlaced = (recipe: Recipe, id: RecipeCardId): boolean =>
  placedCards(recipe).includes(id);

/**
 * Puts a card in its slot. A mark or end card takes the place of the one there (it goes back to
 * the table); a case card joins the set, once.
 */
export function placeCard(recipe: Recipe, id: RecipeCardId): Recipe {
  switch (slotOf(cardOf(id).case)) {
    case 'mark':
      return { ...recipe, mark: id };
    case 'end':
      return { ...recipe, end: id };
    case 'cases':
      return recipe.cases.includes(id) ? recipe : { ...recipe, cases: [...recipe.cases, id] };
  }
}

/** Takes a card out of the recipe, wherever it is; a card not placed changes nothing. */
export const takeCard = (recipe: Recipe, id: RecipeCardId): Recipe => ({
  mark: recipe.mark === id ? null : recipe.mark,
  cases: recipe.cases.filter((card) => card !== id),
  end: recipe.end === id ? null : recipe.end,
});

/** A touch on a card: placed when it is out, taken back when it is in. */
export const toggleCard = (recipe: Recipe, id: RecipeCardId): Recipe =>
  isPlaced(recipe, id) ? takeCard(recipe, id) : placeCard(recipe, id);

/** The recipe without the cards of these cases, as a broken recipe arrives to be repaired (6.3). */
export const withoutCases = (recipe: Recipe, cases: readonly RecipeCase[]): Recipe =>
  placedCards(recipe)
    .filter((id) => cases.includes(cardOf(id).case))
    .reduce(takeCard, recipe);
