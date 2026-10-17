import type Phaser from 'phaser';
import type { RecipeCardId } from '@core/recipe/recipe';
import { cardTextKey } from '@levels/recipeCards';
import type { Translate } from '@services/i18n';
import type { RecipePanelPicture } from '../picture/recipePanel';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { Button } from './Button';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import { textStyle } from './textStyle';

/** Space between rows, and around the panel's contents, in canvas pixels. */
const GAP = 1;
const PAD = 4;
/**
 * Depths: over the garden and the toasts' layer below, under the dialogue box (200), so a hint the
 * mentor says while the panel is open is read over it.
 */
const PANEL_DEPTH = 110;

/** What the panel calls when the player touches it. */
export interface RecipeActions {
  /** A card touched, on the table or in the recipe. */
  readonly card: (card: RecipeCardId) => void;
  /** "Comprobar". */
  readonly check: () => void;
}

/**
 * The recipe with cards in greybox (GDD 6.1, plan 05 phase 2): over the garden, the recipe in its
 * three slots (to start, the cases of a vine, to end) and under it the cards left on the table, one
 * row each. A touch on a card moves it into its slot or back to the table; "Comprobar" asks the
 * core. The cases are a set, and the panel says so: they are listed in the order they were placed,
 * and there is nothing to reorder. What the last check found is told at the bottom. It paints the
 * picture, nothing more, and rebuilds itself only when the picture changes.
 */
export class RecipeView {
  private parts: { destroy(): void }[] = [];
  /** The picture painted now, as a key, so an unchanged picture is not built again. */
  private shown = 'null';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: Translate,
    private readonly actions: RecipeActions,
  ) {}

  /** Paints the panel; null closes it. */
  render(picture: RecipePanelPicture | null): void {
    const key = JSON.stringify(picture);
    if (key === this.shown) return;
    this.shown = key;
    this.close();
    if (picture !== null) this.build(picture);
  }

  /** Builds the panel from the top down; its background is drawn last, once its height is known. */
  private build(picture: RecipePanelPicture): void {
    const { t } = this;
    const x = PAD;
    const top = LAYOUT.garden.y + 1;
    const width = CANVAS_WIDTH - 2 * PAD;
    const inner = width - 2 * PAD;
    let y = top + PAD;

    const heading = (text: string, colour: number = PALETTE.label): void => {
      const shown = this.text(x + PAD, y, text, inner, colour);
      y += shown.height + GAP;
    };
    const rows = (cards: readonly RecipeCardId[], placed: boolean): void => {
      for (const card of cards) y += this.cardRow(card, placed, x + PAD, y, inner) + GAP;
    };
    // A slot with no card says so on its own heading's line, to keep the panel within the garden.
    const slot = (title: string, cards: readonly RecipeCardId[]): void => {
      heading(cards.length === 0 ? `${t(title)} ${t('recipe.empty')}` : t(title));
      rows(cards, true);
    };

    slot('recipe.mark', picture.mark === null ? [] : [picture.mark]);
    slot('recipe.cases', picture.cases);
    slot('recipe.end', picture.end === null ? [] : [picture.end]);
    y += 2;
    heading(t('recipe.table'), PALETTE.darkVine);
    rows(picture.table, false);

    // At the bottom, what the last check found beside the button that asks again.
    const button = new Button(this.scene, 0, 0, t('recipe.check'), () => this.actions.check());
    button.setDepth(PANEL_DEPTH + 2);
    button.moveTo(x + width - PAD - button.width, y + 2);
    this.parts.push(button);
    const told = picture.feedback.map(({ key, params }) => t(key, params)).join(' ');
    const feedback = this.text(x + PAD, y + 2, told, inner - button.width - PAD, PALETTE.highlight);
    const bottom = Math.max(feedback.y + feedback.height, y + 2 + button.height) + PAD;

    const panel = this.scene.add
      .rectangle(x, top, width, bottom - top, PALETTE.panel, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(PANEL_DEPTH)
      .setInteractive();
    this.parts.push(panel);
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

  /** One card as a row that takes the touch; placed cards are lit. Its height. */
  private cardRow(
    card: RecipeCardId,
    placed: boolean,
    x: number,
    y: number,
    width: number,
  ): number {
    const text = this.text(x + 3, y + 1, this.t(cardTextKey(card)), width - 6, PALETTE.label);
    const row = this.scene.add
      .rectangle(x, y, width, text.height + 2, placed ? PALETTE.buttonActive : PALETTE.button)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(PANEL_DEPTH + 1)
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.actions.card(card);
        },
      );
    this.parts.push(row);
    return row.height;
  }

  /** Takes the panel away. */
  private close(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
