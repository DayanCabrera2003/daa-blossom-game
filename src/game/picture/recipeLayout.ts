import type { RecipeCardId } from '@core/recipe/recipe';
import { cardTextKey } from '@levels/recipeCards';
import type { Translate } from '@services/i18n';
import type { PixelRect } from '../assets/frames';
import type { Point } from '../input/target';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from '../view/layout';
import { CHAR_ADVANCE, estimatedButtonWidth } from './bottomRows';
import { BUTTON_HEIGHT } from './panelLayout';
import type { RecipePanelPicture } from './recipePanel';
import { textHeight } from './textWrap';

/**
 * Where everything of the recipe panel goes (GDD 6.1; plan 09, decision on phase 10): the panel
 * over the garden, between the top bar and the toolbar, in two columns. On the left, the recipe:
 * its numbered steps, each with the cards placed in it; on the right, the cards left on the table,
 * and under them "Comprobar". Every text wraps inside its column. With the real words a column can
 * hold more cards than fit (all ten loose cards at the start, or a recipe with every distractor),
 * so a column that overflows is shown a page at a time, never cutting a card or leaving a step's
 * title alone at the bottom of a page, with "‹ 1/2 ›" under it. Pure: the view measures nothing
 * and draws where this says; `tests/recipeFit.test.ts` lays out every recipe a player can build.
 */

/** The measures of the panel, in canvas pixels. */
export const RECIPE_LAYOUT = {
  /** The panel's left edge; it spans the canvas but for this margin on each side. */
  margin: 4,
  /** Just under the top bar, which stays readable. */
  top: LAYOUT.garden.y + 1,
  /** Its lowest edge: the bottom of the garden, above the toolbar and the buttons. */
  bottom: LAYOUT.garden.y + LAYOUT.garden.height,
  /** The air inside the panel's border. */
  pad: 4,
  /** Between the two columns. */
  gutter: 6,
  /** Between two rows of a column. */
  gap: 1,
  /** Before each of the recipe's steps but the first, and before the footer of a column. */
  stepGap: 2,
  /** Between a card's border and its text. */
  inset: 3,
  /** Between the buttons of a footer. */
  buttonGap: 3,
  /**
   * The panel's depth: over the garden, under the toasts (150) and the dialogue box (200), so
   * what a check says and a hint the mentor gives while the panel is open are read over it.
   */
  depth: 110,
} as const;

const { margin, top, bottom, pad, gutter, gap, stepGap, inset, buttonGap } = RECIPE_LAYOUT;

/** The width of each column. */
export const COLUMN_WIDTH = Math.floor((CANVAS_WIDTH - 2 * margin - 2 * pad - gutter) / 2);

/** The left edge of each column. */
const COLUMN_X = { left: margin + pad, right: margin + pad + COLUMN_WIDTH + gutter } as const;

/** A text of the panel, wrapped at its width; `highlight` for the table's own title. */
export interface RecipeTextBox extends PixelRect {
  readonly text: string;
  readonly colour: 'label' | 'highlight';
}

/** A card as a row that takes the touch; its text starts at `textAt` and wraps at `textWidth`. */
export interface RecipeCardBox extends PixelRect {
  readonly card: RecipeCardId;
  readonly placed: boolean;
  readonly textAt: Point;
  readonly textWidth: number;
  readonly text: string;
}

/** A button's label and the top-left corner of its panel, as `Button.moveTo` takes it. */
export interface RecipeButton {
  readonly label: string;
  readonly at: Point;
  readonly width: number;
}

/** The pages of a column that does not fit at once: "‹", "1/2" and "›" in its footer. */
export interface RecipePager {
  readonly previous: RecipeButton;
  readonly next: RecipeButton;
  readonly count: RecipeTextBox;
}

/** One column, at the page shown. */
export interface RecipeColumn {
  readonly texts: readonly RecipeTextBox[];
  readonly cards: readonly RecipeCardBox[];
  /** The page shown (from 0) and how many there are. */
  readonly page: number;
  readonly pages: number;
  /** Null when the column fits at once. */
  readonly pager: RecipePager | null;
}

/** The whole panel. */
export interface RecipeLayout {
  readonly panel: PixelRect;
  readonly left: RecipeColumn;
  readonly right: RecipeColumn;
  readonly check: RecipeButton;
}

/** The pages each column is asked to show; out of range, the nearest page there is. */
export interface RecipePages {
  readonly left: number;
  readonly right: number;
}

/** Something a column lists, top to bottom: a step's title (or the table's), or a card. */
type Item =
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly colour: RecipeTextBox['colour'];
      readonly before: number;
    }
  | { readonly kind: 'card'; readonly card: RecipeCardId; readonly placed: boolean };

/** How tall an item is drawn in a column. */
function heightOf(item: Item, words: Translate): number {
  return item.kind === 'text'
    ? textHeight(item.text, COLUMN_WIDTH)
    : textHeight(words(cardTextKey(item.card)), COLUMN_WIDTH - 2 * inset) + 2;
}

/** How much room an item takes on a page after another one: its own height and the air above. */
const roomOf = (item: Item, words: Translate, first: boolean): number =>
  heightOf(item, words) + (first ? 0 : gap + (item.kind === 'text' ? item.before : 0));

/**
 * The items split into pages `room` pixels tall. A card is never cut, and a title never ends a
 * page while the card after it starts the next one. An item taller than a whole page (none of the
 * game's) gets a page to itself.
 */
function paginate(items: readonly Item[], room: number, words: Translate): Item[][] {
  const pages: Item[][] = [[]];
  let used = 0;
  items.forEach((item, i) => {
    let page = pages[pages.length - 1] ?? [];
    const next = items[i + 1];
    // A title keeps the card under it on its page.
    const needed =
      roomOf(item, words, page.length === 0) +
      (item.kind === 'text' && next?.kind === 'card' ? roomOf(next, words, false) : 0);
    if (page.length > 0 && used + needed > room) {
      page = [];
      pages.push(page);
      used = 0;
    }
    used += roomOf(item, words, page.length === 0);
    page.push(item);
  });
  return pages;
}

/** What the recipe column lists: each step's title, then the cards placed in it. */
function recipeItems(picture: RecipePanelPicture, words: Translate): Item[] {
  const step = (title: string, cards: readonly RecipeCardId[], first: boolean): Item[] => [
    {
      kind: 'text',
      // A step with no card says so on its own title's line.
      text: cards.length === 0 ? `${words(title)} ${words('recipe.empty')}` : words(title),
      colour: 'label',
      before: first ? 0 : stepGap,
    },
    ...cards.map((card): Item => ({ kind: 'card', card, placed: true })),
  ];
  return [
    ...step('recipe.mark', picture.mark === null ? [] : [picture.mark], true),
    ...step('recipe.cases', picture.cases, false),
    ...step('recipe.end', picture.end === null ? [] : [picture.end], false),
  ];
}

/** What the table column lists: its title, then the loose cards. */
const tableItems = (picture: RecipePanelPicture, words: Translate): Item[] => [
  { kind: 'text', text: words('recipe.table'), colour: 'highlight', before: 0 },
  ...picture.table.map((card): Item => ({ kind: 'card', card, placed: false })),
];

/** A button of `label` with its panel's top-left corner at (x, y). */
const button = (label: string, x: number, y: number): RecipeButton => ({
  label,
  at: { x, y },
  width: estimatedButtonWidth(label),
});

/** Where a footer's buttons go: their panels end at the column's last pixel row. */
const FOOTER_HEIGHT = BUTTON_HEIGHT;
/** The room the rows of a column have, with a footer under them or without one. */
const roomWith = (footer: boolean): number =>
  bottom - top - 2 * pad - (footer ? FOOTER_HEIGHT + stepGap : 0);

/** The items of one page, placed from the column's top. */
function placePage(
  items: readonly Item[],
  x: number,
  words: Translate,
): { texts: RecipeTextBox[]; cards: RecipeCardBox[]; end: number } {
  const texts: RecipeTextBox[] = [];
  const cards: RecipeCardBox[] = [];
  let y = top + pad;
  items.forEach((item, i) => {
    if (i > 0) y += gap + (item.kind === 'text' ? item.before : 0);
    const height = heightOf(item, words);
    if (item.kind === 'text') {
      texts.push({ x, y, width: COLUMN_WIDTH, height, text: item.text, colour: item.colour });
    } else {
      cards.push({
        card: item.card,
        placed: item.placed,
        x,
        y,
        width: COLUMN_WIDTH,
        height,
        textAt: { x: x + inset, y: y + 1 },
        textWidth: COLUMN_WIDTH - 2 * inset,
        text: words(cardTextKey(item.card)),
      });
    }
    y += height;
  });
  return { texts, cards, end: y };
}

/** The pager of a column at `x`, in its footer at `y`. */
function pagerAt(x: number, y: number, page: number, pages: number, words: Translate): RecipePager {
  const previous = button(words('recipe.previous'), x, y);
  const countText = words('recipe.page', { page: page + 1, pages });
  const countX = x + previous.width + buttonGap;
  const countWidth = [...countText].length * CHAR_ADVANCE;
  const next = button(words('recipe.next'), countX + countWidth + buttonGap, y);
  return {
    previous,
    next,
    count: {
      x: countX,
      y: y - 1,
      width: countWidth,
      height: BUTTON_HEIGHT,
      text: countText,
      colour: 'label',
    },
  };
}

/** A column laid out at the page asked for (or the nearest there is). */
function columnOf(
  items: readonly Item[],
  x: number,
  asked: number,
  alwaysFooter: boolean,
  words: Translate,
): { column: RecipeColumn; end: number } {
  const whole = paginate(items, roomWith(alwaysFooter), words);
  const pages = whole.length === 1 ? whole : paginate(items, roomWith(true), words);
  const page = Math.min(Math.max(0, Math.floor(asked)), pages.length - 1);
  const placed = placePage(pages[page] ?? [], x, words);
  const footer = alwaysFooter || pages.length > 1;
  const footerY = bottom - pad - FOOTER_HEIGHT + 1;
  const pager = pages.length > 1 ? pagerAt(x, footerY, page, pages.length, words) : null;
  const end = footer ? Math.max(placed.end, bottom - pad) : placed.end;
  return {
    column: { texts: placed.texts, cards: placed.cards, page, pages: pages.length, pager },
    end,
  };
}

/**
 * The panel of `picture` with the words of `words`, each column at the page asked for. "Comprobar"
 * sits at the bottom right of the table's column, so the panel always reaches down to it.
 */
export function recipeLayout(
  picture: RecipePanelPicture,
  words: Translate,
  pages: RecipePages = { left: 0, right: 0 },
): RecipeLayout {
  const left = columnOf(recipeItems(picture, words), COLUMN_X.left, pages.left, false, words);
  const right = columnOf(tableItems(picture, words), COLUMN_X.right, pages.right, true, words);
  const checkLabel = words('recipe.check');
  const check = button(
    checkLabel,
    COLUMN_X.right + COLUMN_WIDTH - estimatedButtonWidth(checkLabel),
    bottom - pad - FOOTER_HEIGHT + 1,
  );
  const end = Math.max(left.end, right.end) + pad;
  return {
    panel: { x: margin, y: top, width: CANVAS_WIDTH - 2 * margin, height: end - top },
    left: left.column,
    right: right.column,
    check,
  };
}

/** Where a card is shown: its column and the page of it that holds it. */
export interface CardPage {
  readonly side: keyof RecipePages;
  readonly page: number;
}

/**
 * The column and page that show `card`, so the view can turn to it once a touch has moved it
 * there; null for a card the picture does not hold.
 */
export function pageOfCard(
  picture: RecipePanelPicture,
  words: Translate,
  card: RecipeCardId,
): CardPage | null {
  for (const side of ['left', 'right'] as const) {
    const { pages } = recipeLayout(picture, words)[side];
    for (let page = 0; page < pages; page += 1) {
      const asked = side === 'left' ? { left: page, right: 0 } : { left: 0, right: page };
      if (recipeLayout(picture, words, asked)[side].cards.some((box) => box.card === card))
        return { side, page };
    }
  }
  return null;
}
