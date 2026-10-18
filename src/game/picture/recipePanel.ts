import type { RecipeFailure } from '@core/recipe/check';
import { isPlaced, type RecipeCardId } from '@core/recipe/recipe';
import { failureTextKey, RECALL_KEY, taughtIn } from '@levels/recipeCards';
import { recipeBoardOf, type LevelSession } from '../systems/levelSession';

/** An interface text to show, as a key of `content/` and its parameters. */
export interface PanelText {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
}

/** Everything the recipe panel shows at one moment (GDD 6.1). */
export interface RecipePanelPicture {
  /** The card in each slot; `cases` in the order the player placed them, which means nothing. */
  readonly mark: RecipeCardId | null;
  readonly cases: readonly RecipeCardId[];
  readonly end: RecipeCardId | null;
  /** The cards not in the recipe, in the table's fixed order. */
  readonly table: readonly RecipeCardId[];
}

/**
 * The order cards lie on the table: right cards and distractors mixed, so their place gives
 * nothing away, and the same every time, so a player who comes back finds them where they were.
 */
export const TABLE_ORDER: readonly RecipeCardId[] = [
  'growMoon',
  'untilNoneDark',
  'foldFlower',
  'markDarkSuns',
  'moonToSun',
  'chainRootToRoot',
  'finishKeepMoons',
  'foldAnyLoop',
  'moonNothing',
  'chainToDark',
];

/**
 * What a toast says of a failed check (plan 09, decision on phase 10): why the first failing card
 * fails, or which case is left unanswered, and the level that taught that case.
 */
export const checkFeedback = (failure: RecipeFailure): readonly PanelText[] => [
  { key: failureTextKey(failure), params: {} },
  { key: RECALL_KEY, params: { level: taughtIn(failure) } },
];

/**
 * The recipe panel of the session now: the recipe in its slots and the cards left on the table;
 * null outside a `recipe` step, when the panel is closed. What a check says is a toast
 * (`checkFeedback`), so the panel only ever shows the cards.
 */
export function recipePicture(session: LevelSession): RecipePanelPicture | null {
  const board = recipeBoardOf(session);
  if (board === null) return null;
  const { recipe } = board;
  return {
    mark: recipe.mark,
    cases: recipe.cases,
    end: recipe.end,
    table: TABLE_ORDER.filter((card) => !isPlaced(recipe, card)),
  };
}
