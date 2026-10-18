import { RECIPE_CARD_IDS } from '@core/recipe/recipe';
import { describe, expect, it } from 'vitest';
import strings from '../../content/es/strings.json';
import { createTranslator } from '../../services/i18n';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from '../view/layout';
import type { RecipePanelPicture } from './recipePanel';
import { TABLE_ORDER } from './recipePanel';
import { COLUMN_WIDTH, pageOfCard, RECIPE_LAYOUT, recipeLayout } from './recipeLayout';

const t = createTranslator(strings);

/** The panel as the step opens: an empty recipe, every card on the table. */
const OPENING: RecipePanelPicture = { mark: null, cases: [], end: null, table: TABLE_ORDER };

/** A recipe with every case card, distractors too, in it: the fullest recipe column. */
const FULL: RecipePanelPicture = {
  mark: 'markDarkSuns',
  cases: [
    'chainToDark',
    'growMoon',
    'chainRootToRoot',
    'foldFlower',
    'moonNothing',
    'moonToSun',
    'foldAnyLoop',
  ],
  end: 'finishKeepMoons',
  table: ['untilNoneDark'],
};

/** The cards a column shows over all its pages. */
function cardsOver(picture: RecipePanelPicture, side: 'left' | 'right'): string[] {
  const { pages } = recipeLayout(picture, t)[side];
  return Array.from({ length: pages }, (_, page) =>
    recipeLayout(picture, t, side === 'left' ? { left: page, right: 0 } : { left: 0, right: page })[
      side
    ].cards.map((box) => box.card),
  ).flat();
}

describe('the layout of the recipe panel (plan 09, decision on phase 10)', () => {
  it('spans the canvas between the top bar and the toolbar, in two columns', () => {
    const { panel, left, right } = recipeLayout(OPENING, t);
    expect(panel.x).toBe(RECIPE_LAYOUT.margin);
    expect(panel.x + panel.width).toBe(CANVAS_WIDTH - RECIPE_LAYOUT.margin);
    expect(panel.y).toBeGreaterThan(LAYOUT.garden.y);
    expect(panel.y + panel.height).toBeLessThanOrEqual(LAYOUT.toolbarY - 1);
    const [leftX, rightX] = [left.texts[0]?.x ?? 0, right.texts[0]?.x ?? 0];
    expect(leftX + COLUMN_WIDTH).toBeLessThan(rightX);
    expect(rightX + COLUMN_WIDTH).toBeLessThanOrEqual(panel.x + panel.width - RECIPE_LAYOUT.pad);
  });

  it('the recipe on the left, its three steps in order; the table on the right', () => {
    const { left, right } = recipeLayout(OPENING, t);
    expect(left.texts.map((box) => box.text)).toEqual([
      `${t('recipe.mark')} ${t('recipe.empty')}`,
      `${t('recipe.cases')} ${t('recipe.empty')}`,
      `${t('recipe.end')} ${t('recipe.empty')}`,
    ]);
    expect(left.cards).toEqual([]);
    expect(right.texts[0]).toMatchObject({ text: t('recipe.table'), colour: 'highlight' });
    expect(right.cards.every((box) => !box.placed)).toBe(true);
  });

  it('pages the ten loose cards, each once, in the table order', () => {
    const { right } = recipeLayout(OPENING, t);
    expect(right.pages).toBeGreaterThan(1);
    expect(right.pager).not.toBeNull();
    expect(cardsOver(OPENING, 'right')).toEqual([...TABLE_ORDER]);
    // The table's title opens only its first page.
    expect(recipeLayout(OPENING, t, { left: 0, right: 1 }).right.texts).toEqual([]);
  });

  it('pages a recipe holding nine cards, each once, in its steps', () => {
    const { left } = recipeLayout(FULL, t);
    expect(left.pages).toBeGreaterThan(1);
    expect(cardsOver(FULL, 'left')).toEqual([FULL.mark, ...FULL.cases, FULL.end]);
    expect(cardsOver(FULL, 'left')).toHaveLength(RECIPE_CARD_IDS.length - 1);
  });

  it('a column that fits shows no pager', () => {
    const { left } = recipeLayout(OPENING, t);
    expect(left.pages).toBe(1);
    expect(left.pager).toBeNull();
  });

  it('a page asked for out of range shows the nearest there is', () => {
    expect(recipeLayout(OPENING, t, { left: -3, right: 99 }).right.page).toBe(
      recipeLayout(OPENING, t).right.pages - 1,
    );
    expect(recipeLayout(OPENING, t, { left: -3, right: 0 }).left.page).toBe(0);
  });

  it('writes the page on the pager, and puts "Comprobar" at the right of the table column', () => {
    const { right, check } = recipeLayout(OPENING, t);
    expect(right.pager?.count.text).toBe(t('recipe.page', { page: 1, pages: right.pages }));
    expect(check.label).toBe(t('recipe.check'));
    const rightX = right.texts[0]?.x ?? 0;
    expect(check.at.x + check.width).toBe(rightX + COLUMN_WIDTH);
  });

  it('finds the page that shows a card, in the column it lies in', () => {
    const last = TABLE_ORDER[TABLE_ORDER.length - 1] ?? 'chainToDark';
    expect(pageOfCard(OPENING, t, last)).toEqual({
      side: 'right',
      page: recipeLayout(OPENING, t).right.pages - 1,
    });
    expect(pageOfCard(FULL, t, 'markDarkSuns')).toEqual({ side: 'left', page: 0 });
    expect(pageOfCard({ ...OPENING, table: [] }, t, 'growMoon')).toBeNull();
  });
});
