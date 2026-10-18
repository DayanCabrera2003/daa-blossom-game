import type Phaser from 'phaser';
import { itemAt } from '@core/shared/itemAt';
import { playUiSound } from '../audio/uiSound';
import type { AssetKey } from '../assets/keys';
import {
  innerWidth,
  NOTEBOOK_HEADER,
  NOTEBOOK_ICON,
  notebookLayout,
  PANEL,
  QUESTION_PANEL,
} from '../picture/panelLayout';
import { WOOD_BUTTON, WOOD_PANEL } from '../picture/wood';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import type { ShownOption } from './QuestionView';
import { textStyle } from './textStyle';
import { WoodFrame } from './WoodFrame';
import { coverWith } from './focusables';

/** What the notebook page shows, already translated. */
export interface ShownNotebook {
  /** The name of the notebook, on top of the page. */
  readonly title: string;
  /** The start of the statement ("Una cadena que empieza y termina…"). */
  readonly prompt: string;
  /** A short instruction, on the right of the top row. */
  readonly footer: string;
  /** The endings on offer, one per row. */
  readonly options: readonly ShownOption[];
}

/** Depths: the blocker over the garden, then the page, its rows and their text. */
const BLOCKER_DEPTH = 150;
const PAGE_DEPTH = 250;
/** The book of the pack, before the notebook's name. */
const BOOK: AssetKey = 'icon.book';
/** The page turns of the notebook, taken in turn so two answers in a row do not sound alike. */
const FLIPS: readonly AssetKey[] = ['sfx.bookFlip1', 'sfx.bookFlip2', 'sfx.bookFlip3'];

/**
 * The notebook question (GDD §5.5, plan 03, phase 6): a wooden page (laid out by
 * `picture/panelLayout.ts`) with the book and the notebook's name on top, the start of the
 * statement and one wooden row per ending, each long enough to wrap, so it is not a row of buttons
 * like a question but a list to read. A dim layer over the garden takes the touches meant for it.
 * Choosing an ending gives its value to the scene, which tells the script; a false one then opens
 * its counterexample.
 */
export class NotebookView {
  private parts: { destroy(): void }[] = [];
  /** How many pages have turned, for the next page turn's sound. */
  private flips = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Whether the page is on screen. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /** Opens the page; `onAnswer` gets the value of the ending the player touches. */
  show(notebook: ShownNotebook, onAnswer: (value: number) => void): void {
    // A page already open turns to the new one; a closed notebook opens.
    const turning = this.open;
    this.clear();
    const { scene } = this;
    if (!turning) playUiSound(scene, 'sfx.bookOpen');
    const { x, y, width } = QUESTION_PANEL;
    const inner = innerWidth(width);
    const left = x + PANEL.pad;
    const ink = PALETTE[WOOD_PANEL.text];
    const blocker = coverWith(
      scene.add
        .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.3)
        .setOrigin(0, 0)
        .setDepth(BLOCKER_DEPTH)
        .setInteractive(),
    );
    this.parts.push(blocker);

    // The top row: the book and the notebook's name on the left, what to do on the right.
    const top = y + PANEL.pad;
    const middle = top + NOTEBOOK_HEADER / 2;
    if (scene.textures.exists(BOOK)) {
      this.parts.push(
        scene.add
          .image(left, top, BOOK)
          .setOrigin(0, 0)
          .setDepth(PAGE_DEPTH + 1),
      );
    }
    const title = scene.add
      .text(left + NOTEBOOK_ICON, middle, notebook.title, textStyle(8, ink))
      .setOrigin(0, 0.5)
      .setDepth(PAGE_DEPTH + 1);
    const footer = scene.add
      .text(x + width - PANEL.pad, middle, notebook.footer, textStyle(8, ink))
      .setOrigin(1, 0.5)
      .setDepth(PAGE_DEPTH + 1);
    const prompt = scene.add
      .text(left, 0, notebook.prompt, { ...textStyle(8, ink), wordWrap: { width: inner } })
      .setDepth(PAGE_DEPTH + 1);
    this.parts.push(title, footer, prompt);

    // One row per ending, laid out once their texts are measured: the whole row takes the touch.
    const texts = notebook.options.map((option) =>
      scene.add
        .text(left + 3, 0, option.label, {
          ...textStyle(8, PALETTE[WOOD_BUTTON.idle.text]),
          wordWrap: { width: inner - 6 },
        })
        .setDepth(PAGE_DEPTH + 3),
    );
    const layout = notebookLayout(
      prompt.height,
      texts.map((text) => text.height + 4),
    );
    prompt.setY(layout.promptY);
    notebook.options.forEach((option, i) =>
      this.addRow(option, itemAt(texts, i), itemAt(layout.rows, i), onAnswer),
    );
    const page = new WoodFrame(
      scene,
      WOOD_PANEL,
      { x, y, width, height: layout.height },
      PAGE_DEPTH,
    );
    page.zone.setInteractive();
    this.parts.push(page);
  }

  /** Closes the notebook, taking the page and its blocker away. */
  close(): void {
    if (this.open) playUiSound(this.scene, 'sfx.bookClose');
    this.clear();
  }

  /** The row of one ending at `rowY`, under its text, turning the page when touched. */
  private addRow(
    option: ShownOption,
    text: Phaser.GameObjects.Text,
    rowY: number,
    onAnswer: (value: number) => void,
  ): void {
    const { scene } = this;
    text.setY(rowY + 2);
    const row = new WoodFrame(
      scene,
      WOOD_BUTTON.idle,
      { x: text.x - 3, y: rowY, width: innerWidth(QUESTION_PANEL.width), height: text.height + 4 },
      PAGE_DEPTH + 2,
      PALETTE.button,
    );
    row.zone
      .setInteractive({ useHandCursor: true })
      .on(
        'pointerdown',
        (_: Phaser.Input.Pointer, __: number, ___: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          const flip = this.flips;
          this.flips = flip + 1;
          playUiSound(scene, FLIPS[flip % FLIPS.length] ?? 'sfx.bookFlip1');
          onAnswer(option.value);
        },
      );
    this.parts.push(row, text);
  }

  private clear(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
