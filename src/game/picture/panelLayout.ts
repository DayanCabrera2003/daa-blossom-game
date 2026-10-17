import type { Point } from '../input/target';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LINE_HEIGHT } from './textWrap';

/**
 * Where the texts and buttons of the wooden panels go (plan 06, phase 5): a question or a bet, the
 * notebook and the window of a mechanic card. Pure: the views measure their texts and place them
 * where this says, and `tests/panelFit.test.ts` measures every text of the game the same way, so a
 * panel that would spill over the dialogue box or the toolbar is caught before it ships.
 */

/** Inside a panel: from its edge to its contents (the wood's border and a little air), and between rows. */
export const PANEL = { pad: 8, gap: 4 } as const;

/** A button a line of text tall, with a pixel of wood above and below it. */
export const BUTTON_HEIGHT = LINE_HEIGHT + 2;

/** The panel of a question, a bet and the notebook, near the top so the dialogue box stays free. */
export const QUESTION_PANEL = { x: 40, y: 28, width: CANVAS_WIDTH - 80 } as const;

/** The window of a mechanic card, centred across the canvas. */
export const TUTORIAL_PANEL = { x: (CANVAS_WIDTH - 296) / 2, y: 28, width: 296 } as const;

/** The width inside a panel of `width`, where its texts wrap. */
export const innerWidth = (width: number): number => width - 2 * PANEL.pad;

/** Buttons laid out in rows: where each one's panel starts, and the bottom of the last row. */
export interface FlowLayout {
  readonly positions: readonly Point[];
  readonly bottom: number;
}

/**
 * Buttons of `widths` flowing left to right from (`left`, `top`) and wrapping before `right`, so a
 * row of numbers and a column of written answers both fit; a button wider than the row gets a row
 * of its own.
 */
export function flowButtons(
  widths: readonly number[],
  left: number,
  right: number,
  gap: number,
  top: number,
): FlowLayout {
  let x = left;
  let y = top;
  const positions = widths.map((width) => {
    if (x > left && x + width > right) {
      x = left;
      y += BUTTON_HEIGHT + gap;
    }
    const at = { x, y };
    x += width + gap;
    return at;
  });
  return { positions, bottom: y + BUTTON_HEIGHT };
}

/** A question panel laid out: its prompt, its options' buttons, its footer and its height. */
export interface QuestionLayout {
  readonly prompt: Point;
  readonly buttons: readonly Point[];
  readonly footer: Point;
  readonly height: number;
}

/** The question panel for a prompt `promptHeight` tall and options of `widths`. */
export function questionLayout(promptHeight: number, widths: readonly number[]): QuestionLayout {
  const { x, y, width } = QUESTION_PANEL;
  const left = x + PANEL.pad;
  const prompt = { x: left, y: y + PANEL.pad };
  const top = prompt.y + promptHeight + PANEL.gap;
  const flow = flowButtons(widths, left, x + width - PANEL.pad, PANEL.gap, top);
  const footer = { x: left, y: flow.bottom + PANEL.gap };
  return {
    prompt,
    buttons: flow.positions,
    footer,
    height: footer.y + LINE_HEIGHT + PANEL.pad - y,
  };
}

/** The notebook page laid out: where its statement, each ending's row and its footer start. */
export interface NotebookLayout {
  readonly promptY: number;
  readonly rows: readonly number[];
  readonly footerY: number;
  readonly height: number;
}

/** The notebook page for a statement `promptHeight` tall and rows of `rowHeights`. */
export function notebookLayout(
  promptHeight: number,
  rowHeights: readonly number[],
): NotebookLayout {
  const { y } = QUESTION_PANEL;
  // The notebook's name, a line, on top of the page.
  const promptY = y + PANEL.pad + LINE_HEIGHT + PANEL.gap;
  let rowY = promptY + promptHeight + PANEL.gap;
  const rows = rowHeights.map((height) => {
    const at = rowY;
    rowY += height + PANEL.gap;
    return at;
  });
  return { promptY, rows, footerY: rowY, height: rowY + LINE_HEIGHT + PANEL.pad - y };
}

/** The window of a card laid out: where its body, demo and button start, and its height. */
export interface TutorialLayout {
  readonly bodyY: number;
  readonly demoY: number;
  readonly buttonY: number;
  readonly height: number;
}

/** The window of a card whose body is `bodyHeight` tall and whose demo is `demoHeight` tall. */
export function tutorialLayout(bodyHeight: number, demoHeight: number): TutorialLayout {
  const { y } = TUTORIAL_PANEL;
  // The card's title, a line, on top of the window.
  const bodyY = y + PANEL.pad + LINE_HEIGHT + PANEL.gap;
  const demoY = bodyY + bodyHeight + PANEL.gap;
  const buttonY = demoY + demoHeight + PANEL.gap;
  return { bodyY, demoY, buttonY, height: buttonY + BUTTON_HEIGHT + PANEL.pad - y };
}
