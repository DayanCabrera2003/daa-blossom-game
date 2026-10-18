import type Phaser from 'phaser';
import type { RecipeCardId } from '@core/recipe/recipe';
import type { Translate } from '@services/i18n';
import type { RecipePanelPicture } from '../picture/recipePanel';
import {
  pageOfCard,
  RECIPE_LAYOUT,
  recipeLayout,
  type RecipeButton,
  type RecipeCardBox,
  type RecipeLayout,
  type RecipePages,
} from '../picture/recipeLayout';
import { Button } from './Button';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';
import { addFocusable, coverWith } from './focusables';

/** Depths of the panel's parts, over its wood (`picture/recipeLayout.ts`). */
const PANEL_DEPTH = RECIPE_LAYOUT.depth;

/** What the panel calls when the player touches it. */
export interface RecipeActions {
  /** A card touched, on the table or in the recipe. */
  readonly card: (card: RecipeCardId) => void;
  /** "Comprobar". */
  readonly check: () => void;
}

/**
 * The recipe with cards (GDD 6.1, plan 05 phase 2; laid out in two columns by plan 09): over the
 * garden, on the left the recipe in its three steps (to start, the cases of a vine, to end) with the
 * cards placed in each, and on the right the cards left on the table, with "Comprobar" under them.
 * A touch on a card moves it into its step or back to the table, and the column it went to turns
 * to the page that shows it; "‹" and "›" turn the pages of a column that does not fit at once.
 * The cases are a set, and the panel says so: they are listed in the order they were placed, and
 * there is nothing to reorder. What a check finds is a toast, not a row of the panel. It paints
 * what `picture/recipeLayout.ts` says, nothing more, and rebuilds itself only when that changes.
 */
export class RecipeView {
  private parts: { destroy(): void }[] = [];
  /** The panel painted now, as a key, so an unchanged panel is not built again. */
  private shown = 'null';
  /** The page each column shows. */
  private pages: RecipePages = { left: 0, right: 0 };
  /** The picture painted last, to turn its pages. */
  private picture: RecipePanelPicture | null = null;
  /** The card touched last, whose new page the next picture turns to. */
  private follow: RecipeCardId | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
    private readonly actions: RecipeActions,
  ) {}

  /** Paints the panel; null closes it. */
  render(picture: RecipePanelPicture | null): void {
    if (picture === null) this.pages = { left: 0, right: 0 };
    else if (this.follow !== null) {
      const found = pageOfCard(picture, this.t, this.follow);
      if (found !== null) this.pages = { ...this.pages, [found.side]: found.page };
    }
    this.follow = null;
    this.picture = picture;
    const key = JSON.stringify({ picture, pages: this.pages });
    if (key === this.shown) return;
    this.shown = key;
    this.close();
    if (picture !== null) this.build(recipeLayout(picture, this.t, this.pages));
  }

  /** Turns a column by `step` pages and paints it again. */
  private turn(side: keyof RecipePages, step: number): void {
    this.pages = { ...this.pages, [side]: this.pages[side] + step };
    const { picture } = this;
    if (picture === null) return;
    // Clamped to the pages there are, so turning past the last page stays on it.
    const layout = recipeLayout(picture, this.t, this.pages);
    this.pages = { left: layout.left.page, right: layout.right.page };
    this.render(picture);
  }

  /** Builds the panel where its layout says. */
  private build(layout: RecipeLayout): void {
    const { panel } = layout;
    this.parts.push(
      coverWith(
        this.scene.add
          .rectangle(panel.x, panel.y, panel.width, panel.height, PALETTE.panel, 0.97)
          .setOrigin(0, 0)
          .setStrokeStyle(1, PALETTE.panelEdge)
          .setDepth(PANEL_DEPTH)
          .setInteractive(),
      ),
    );
    for (const side of ['left', 'right'] as const) {
      const column = layout[side];
      for (const box of column.texts) {
        const colour = box.colour === 'highlight' ? PALETTE.highlight : PALETTE.label;
        this.text(box.x, box.y, box.text, box.width, colour);
      }
      for (const card of column.cards) this.cardRow(card);
      if (column.pager !== null) {
        const { previous, next, count } = column.pager;
        this.button(previous, () => this.turn(side, -1)).setEnabled(column.page > 0);
        this.text(count.x, count.y + 1, count.text, count.width, PALETTE.label);
        this.button(next, () => this.turn(side, 1)).setEnabled(column.page < column.pages - 1);
      }
    }
    this.button(layout.check, () => this.actions.check());
  }

  /** A button of the panel where its layout puts it. */
  private button(place: RecipeButton, press: () => void): Button {
    const button = new Button(this.scene, 0, 0, place.label, press);
    button.setDepth(PANEL_DEPTH + 2);
    button.moveTo(place.at.x, place.at.y);
    this.parts.push(button);
    return button;
  }

  /** A line of text on the panel, wrapped at `width`. */
  private text(
    x: number,
    y: number,
    text: string,
    width: number,
    colour: number,
  ): Phaser.GameObjects.Text {
    const shown = this.scene.add
      .text(x, y, text, { ...textStyle(8, colour), wordWrap: { width } })
      .setDepth(PANEL_DEPTH + 3);
    this.parts.push(shown);
    return shown;
  }

  /** One card as a row that takes the touch; placed cards are lit. */
  private cardRow(card: RecipeCardBox): void {
    // Dark letters on the light wood of a card, as on a button at rest (`picture/textContrast.ts`).
    this.text(card.textAt.x, card.textAt.y, card.text, card.textWidth, PALETTE.ink);
    const press = (): void => {
      this.follow = card.card;
      this.actions.card(card.card);
    };
    const row = this.scene.add
      .rectangle(
        card.x,
        card.y,
        card.width,
        card.height,
        card.placed ? PALETTE.buttonActive : PALETTE.button,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(PANEL_DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          press();
        },
      );
    this.parts.push(row);
    addFocusable(this.scene, {
      box: () => ({ x: row.x, y: row.y, width: row.width, height: row.height }),
      depth: () => row.depth,
      live: () => row.active,
      press,
    });
  }

  /** Takes the panel away. */
  private close(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
