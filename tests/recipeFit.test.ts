import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { checkRecipe } from '../src/core/recipe/check';
import { RECIPE_CARDS, type Recipe, type RecipeCardId } from '../src/core/recipe/recipe';
import type { PixelRect } from '../src/game/assets/frames';
import { DIALOGUE_DEPTH } from '../src/game/picture/dialogueBox';
import { BUTTON_HEIGHT } from '../src/game/picture/panelLayout';
import {
  checkFeedback,
  TABLE_ORDER,
  type RecipePanelPicture,
} from '../src/game/picture/recipePanel';
import {
  recipeLayout,
  RECIPE_LAYOUT,
  type RecipeButton,
  type RecipeLayout,
} from '../src/game/picture/recipeLayout';
import { LINE_HEIGHT, textHeight, wrappedLines, charsIn } from '../src/game/picture/textWrap';
import { TOAST, toastBox } from '../src/game/picture/toastBox';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { LAYOUT } from '../src/game/view/layout';
import { catalog } from '../src/levels/catalog';
import { createTranslator } from '../src/services/i18n';
import { RECIPE_FIT_TIMEOUT } from './support/timeouts';

// The recipe panel of 6.1 and 6.3 (plan 09, decision on phase 10) with the real words of the game,
// in the pixel font: for every recipe a player can build, on every page of both columns, nothing
// is drawn over anything else, every text fits its box, everything stays inside the panel, and the
// panel inside the canvas, under the top bar and above the toolbar. What a check says is a toast,
// which fits too, and the dialogue box is drawn over both.

const t = createTranslator(strings);

/** The cards of each slot. */
const MARKS = RECIPE_CARDS.filter((card) => card.case === 'start').map((card) => card.id);
const ENDS = RECIPE_CARDS.filter((card) => card.case === 'end').map((card) => card.id);
const CASES = RECIPE_CARDS.filter((card) => card.case !== 'start' && card.case !== 'end').map(
  (card) => card.id,
);

/** Every recipe a player can build: any start (or none), any set of case cards, any end. */
function everyRecipe(): Recipe[] {
  const recipes: Recipe[] = [];
  for (const mark of [null, ...MARKS])
    for (const end of [null, ...ENDS])
      for (let set = 0; set < 1 << CASES.length; set += 1) {
        const cases = CASES.filter((_, i) => (set & (1 << i)) !== 0);
        recipes.push({ mark, cases, end });
      }
  return recipes;
}

/** The panel's picture of a recipe, its loose cards in the table's order. */
const pictureOf = (recipe: Recipe): RecipePanelPicture => {
  const placed = new Set<RecipeCardId>([
    ...(recipe.mark === null ? [] : [recipe.mark]),
    ...recipe.cases,
    ...(recipe.end === null ? [] : [recipe.end]),
  ]);
  return { ...recipe, table: TABLE_ORDER.filter((card) => !placed.has(card)) };
};

/** A button's panel, as `Button.moveTo` draws it: one pixel above the corner it is given. */
const buttonBox = (button: RecipeButton): PixelRect => ({
  x: button.at.x,
  y: button.at.y - 1,
  width: button.width,
  height: BUTTON_HEIGHT,
});

/** Whether two boxes share a pixel. */
const overlap = (a: PixelRect, b: PixelRect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Whether `inner` lies inside `outer`, `air` pixels away from its edges. */
const inside = (inner: PixelRect, outer: PixelRect, air = 0): boolean =>
  inner.x >= outer.x + air &&
  inner.y >= outer.y + air &&
  inner.x + inner.width <= outer.x + outer.width - air &&
  inner.y + inner.height <= outer.y + outer.height - air;

/** Every box drawn on the panel at one page of each column. */
function boxesOf(layout: RecipeLayout): PixelRect[] {
  const column = (side: 'left' | 'right'): PixelRect[] => {
    const { texts, cards, pager } = layout[side];
    return [
      ...texts,
      ...cards,
      ...(pager === null ? [] : [buttonBox(pager.previous), pager.count, buttonBox(pager.next)]),
    ];
  };
  return [...column('left'), ...column('right'), buttonBox(layout.check)];
}

/** What is wrong with the panel at one page of each column, if anything. */
function problemsOf(layout: RecipeLayout): string[] {
  const problems: string[] = [];
  const { panel } = layout;
  const canvas = { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
  if (!inside(panel, canvas, RECIPE_LAYOUT.margin)) problems.push('panel off the canvas');
  if (panel.y <= LAYOUT.garden.y) problems.push('panel over the top bar');
  if (panel.y + panel.height > LAYOUT.toolbarY - 1) problems.push('panel over the toolbar');
  const boxes = boxesOf(layout);
  boxes.forEach((box, i) => {
    if (!inside(box, panel, 1)) problems.push(`box ${i} off the panel`);
    boxes.slice(i + 1).forEach((other, j) => {
      if (overlap(box, other)) problems.push(`boxes ${i} and ${i + 1 + j} overlap`);
    });
  });
  for (const side of ['left', 'right'] as const) {
    for (const text of layout[side].texts)
      if (textHeight(text.text, text.width) > text.height) problems.push(`"${text.text}" spills`);
    for (const card of layout[side].cards) {
      const lines = wrappedLines(card.text, charsIn(card.textWidth));
      if (card.textAt.y + lines * LINE_HEIGHT > card.y + card.height)
        problems.push(`card ${card.card} spills`);
      if (card.textAt.x + card.textWidth > card.x + card.width)
        problems.push(`card ${card.card} too wide`);
    }
  }
  return problems;
}

/** The layouts of every page of both columns of a picture. */
function everyPage(picture: RecipePanelPicture): RecipeLayout[] {
  const first = recipeLayout(picture, t);
  const layouts: RecipeLayout[] = [];
  for (let left = 0; left < first.left.pages; left += 1)
    for (let right = 0; right < first.right.pages; right += 1)
      layouts.push(recipeLayout(picture, t, { left, right }));
  return layouts;
}

describe('the recipe panel fits with the real words (plan 09, phase 10)', () => {
  it('is shown by 6.1 and 6.3, the levels of the recipe', () => {
    const recipeLevels = catalog()
      .filter((level) => level.flow.some((step) => step.step === 'recipe'))
      .map((level) => level.data.id);
    expect(recipeLevels).toEqual(['6.1', '6.3']);
  });

  it(
    'fits on every page of every recipe a player can build',
    () => {
      const recipes = everyRecipe();
      expect(recipes).toHaveLength(2 * 3 * 2 ** CASES.length);
      for (const recipe of recipes) {
        const picture = pictureOf(recipe);
        for (const layout of everyPage(picture)) {
          const problems = problemsOf(layout);
          expect(problems, JSON.stringify(recipe)).toEqual([]);
        }
        // Every card shows once over the pages of its column.
        const shown = everyPage(picture).flatMap((layout) => [
          ...layout.left.cards.map((box) => box.card),
          ...layout.right.cards.map((box) => box.card),
        ]);
        expect(new Set(shown).size).toBe(RECIPE_CARDS.length);
      }
    },
    RECIPE_FIT_TIMEOUT,
  );

  it('tells every verdict of a check in a toast that fits under the top bar', () => {
    const told = new Set(
      everyRecipe().flatMap((recipe) => {
        const verdict = checkRecipe(recipe);
        return verdict.right
          ? []
          : [
              checkFeedback(verdict.failure)
                .map(({ key, params }) => t(key, params))
                .join(' '),
            ];
      }),
    );
    expect(told.size).toBeGreaterThanOrEqual(10);
    for (const text of told) {
      expect(text).not.toContain('‹');
      const chars = charsIn(TOAST.wrap);
      const lines = wrappedLines(text, chars);
      const width = Math.min(TOAST.wrap, [...text].length * 6);
      const box = toastBox(width, lines * LINE_HEIGHT);
      expect(box.x, text).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, text).toBeLessThanOrEqual(CANVAS_WIDTH);
      expect(box.y, text).toBeGreaterThan(LAYOUT.garden.y);
      expect(box.y + box.height, text).toBeLessThanOrEqual(LAYOUT.toolbarY);
    }
  });

  it('lies under the toasts and the dialogue box', () => {
    expect(RECIPE_LAYOUT.depth).toBeLessThan(TOAST.depth);
    expect(TOAST.depth).toBeLessThan(DIALOGUE_DEPTH);
  });
});
