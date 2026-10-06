import type Phaser from 'phaser';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from './layout';
import { PALETTE } from './palette';
import type { ShownOption } from './QuestionView';
import { textStyle } from './textStyle';

/** What the notebook page shows, already translated. */
export interface ShownNotebook {
  /** The name of the notebook, on top of the page. */
  readonly title: string;
  /** The start of the statement ("Una cadena que empieza y termina…"). */
  readonly prompt: string;
  /** A short instruction under the statements. */
  readonly footer: string;
  /** The endings on offer, one per row. */
  readonly options: readonly ShownOption[];
}

/** Space between rows, and around the page's contents, in canvas pixels. */
const GAP = 3;
const PAD = 6;
/** Depths: the blocker over the garden, then the page, its rows and their text. */
const BLOCKER_DEPTH = 150;
const PAGE_DEPTH = 250;

/**
 * The notebook question (GDD §5.5, plan 03, phase 6): a page with the start of the statement and
 * one row per ending, each long enough to wrap, so it is not a row of buttons like a question but
 * a list to read. A dim layer over the garden takes the touches meant for it. Choosing an ending
 * gives its value to the scene, which tells the script; a false one then opens its counterexample.
 */
export class NotebookView {
  private parts: { destroy(): void }[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** Whether the page is on screen. */
  get open(): boolean {
    return this.parts.length > 0;
  }

  /** Opens the page; `onAnswer` gets the value of the ending the player touches. */
  show(notebook: ShownNotebook, onAnswer: (value: number) => void): void {
    this.close();
    const { scene } = this;
    const { x, y, width } = LAYOUT.question;
    const inner = width - 2 * PAD;
    const blocker = scene.add
      .rectangle(0, LAYOUT.garden.y, CANVAS_WIDTH, LAYOUT.garden.height, PALETTE.fog, 0.3)
      .setOrigin(0, 0)
      .setDepth(BLOCKER_DEPTH)
      .setInteractive();
    const title = scene.add
      .text(x + PAD, y + PAD, notebook.title, textStyle(8, PALETTE.lit))
      .setDepth(PAGE_DEPTH + 1);
    const prompt = scene.add
      .text(x + PAD, title.y + title.height + GAP, notebook.prompt, {
        ...textStyle(8),
        wordWrap: { width: inner },
      })
      .setDepth(PAGE_DEPTH + 1);
    this.parts.push(blocker, title, prompt);

    // One row per ending: its text wraps inside, and the whole row takes the touch.
    let rowY = prompt.y + prompt.height + GAP + 1;
    for (const option of notebook.options) {
      const text = scene.add
        .text(x + PAD + 3, rowY + 2, option.label, {
          ...textStyle(8),
          wordWrap: { width: inner - 6 },
        })
        .setDepth(PAGE_DEPTH + 3);
      const row = scene.add
        .rectangle(x + PAD, rowY, inner, text.height + 4, PALETTE.button)
        .setOrigin(0, 0)
        .setStrokeStyle(1, PALETTE.panelEdge)
        .setDepth(PAGE_DEPTH + 2)
        .setInteractive({ useHandCursor: true })
        .on(
          'pointerdown',
          (
            _: Phaser.Input.Pointer,
            __: number,
            ___: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            event.stopPropagation();
            onAnswer(option.value);
          },
        );
      this.parts.push(row, text);
      rowY += row.height + GAP;
    }
    const footer = scene.add
      .text(x + PAD, rowY + 1, notebook.footer, textStyle(8, PALETTE.darkVine))
      .setDepth(PAGE_DEPTH + 1);
    // The page is drawn last, once its height is known; depth keeps it under its contents.
    const page = scene.add
      .rectangle(x, y, width, footer.y + footer.height + PAD - y, PALETTE.panel, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, PALETTE.panelEdge)
      .setDepth(PAGE_DEPTH)
      .setInteractive();
    this.parts.push(footer, page);
  }

  /** Takes the page and its blocker away. */
  close(): void {
    for (const part of this.parts) part.destroy();
    this.parts = [];
  }
}
