import type { Point } from '../input/target';
import { itemAt } from '@core/shared/itemAt';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Where the greybox hub puts each chapter on the 480×270 canvas: its title at the left of its
 * first line, and its level buttons right after the title, left to right, going on to a new line
 * (under the first button) only when the next button would cross the right margin. Keeping the
 * title on the line of the buttons leaves room for the eight chapters in the pixel font's taller
 * lines. Pure: the scene measures the titles and the buttons and places them where this says.
 */
export const HUB = {
  /** Clear space at the left and right edges of the canvas. */
  margin: 8,
  /** Where the first chapter sits, under the hub's own title. */
  top: 24,
  /** From the end of a chapter title to its first button. */
  titleGap: 8,
  /** Between two buttons side by side, between two lines of buttons, and between chapters. */
  gap: 4,
  /**
   * The top of the "Exportar registro de prueba" button, on the top line between the hub's title
   * and the settings, so the bottom of the canvas is free for the hub's garden.
   */
  exportY: 5,
  /** Where the bed of the hub's garden starts, along the bottom: the chapters end above it. */
  gardenTop: CANVAS_HEIGHT - 48,
} as const;

/** Where one chapter goes: the top of its title, and the top-left corner of each level button. */
export interface ChapterPlacement {
  readonly titleY: number;
  readonly buttons: readonly Point[];
}

/**
 * Lays the chapters out from the top, given the width of each level button by chapter (in catalog
 * order), the height of a button, and the width of each chapter's title. A title is written at the
 * margin, as high as a button. `bottom` is where the last line ends. A button too wide for the room
 * after the title starts a line of its own from the margin, below the title.
 */
export function layoutHub(
  widths: readonly (readonly number[])[],
  buttonHeight: number,
  titleWidths: readonly number[],
): { readonly chapters: ChapterPlacement[]; readonly bottom: number } {
  const right = CANVAS_WIDTH - HUB.margin;
  const step = buttonHeight + HUB.gap;
  let y: number = HUB.top;
  let bottom: number = HUB.top;
  const chapters = widths.map((row, c): ChapterPlacement => {
    const titleY = y;
    const indent = HUB.margin + itemAt(titleWidths, c) + HUB.titleGap;
    let line = titleY;
    // Where the current line's buttons start, and where the next one goes.
    let start = indent;
    let x = indent;
    const buttons = row.map((width): Point => {
      if (x > start && x + width > right) {
        line += step;
        start = indent;
        x = indent;
      }
      if (x === indent && x + width > right) {
        // Too wide for the room after the title: a line of its own, under the title.
        if (line === titleY) line += step;
        start = HUB.margin;
        x = HUB.margin;
      }
      const at = { x, y: line };
      x += width + HUB.gap;
      return at;
    });
    bottom = line + buttonHeight;
    y = bottom + HUB.gap;
    return { titleY, buttons };
  });
  return { chapters, bottom };
}
