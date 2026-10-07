import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';

/**
 * Where the greybox hub puts each chapter on the 480×270 canvas: its title on a line of its own,
 * and below it the buttons of its levels, left to right, going on to a new line only when the next
 * button would cross the right margin. The title above the row leaves the whole width to the
 * buttons, so the nine levels of chapter 1 fit in one row. Pure: the scene measures the buttons and
 * places them where this says.
 */
export const HUB = {
  /** Clear space at the left and right edges of the canvas. */
  margin: 8,
  /** Where the first chapter title sits, under the hub's own title. */
  top: 24,
  /** From a chapter title to the top of its first line of buttons. */
  titleHeight: 10,
  /** Between two buttons side by side, between two lines of buttons, and between chapters. */
  gap: 4,
  /** The top of the "Exportar registro de prueba" button, at the bottom left. */
  exportY: CANVAS_HEIGHT - 18,
} as const;

/** Where one chapter goes: the top of its title, and the top-left corner of each level button. */
export interface ChapterPlacement {
  readonly titleY: number;
  readonly buttons: readonly Point[];
}

/**
 * Lays the chapters out from the top, given the width of each level button by chapter (in catalog
 * order) and the height of a button. `bottom` is where the last row ends. A button wider than the
 * whole row cannot fit anywhere; it starts its own line.
 */
export function layoutHub(
  widths: readonly (readonly number[])[],
  buttonHeight: number,
): { readonly chapters: ChapterPlacement[]; readonly bottom: number } {
  const right = CANVAS_WIDTH - HUB.margin;
  let y: number = HUB.top;
  let bottom: number = HUB.top;
  const chapters = widths.map((row): ChapterPlacement => {
    const titleY = y;
    let line = titleY + HUB.titleHeight;
    let x = HUB.margin;
    const buttons = row.map((width): Point => {
      if (x > HUB.margin && x + width > right) {
        line += buttonHeight + HUB.gap;
        x = HUB.margin;
      }
      const at = { x, y: line };
      x += width + HUB.gap;
      return at;
    });
    bottom = row.length === 0 ? line : line + buttonHeight;
    y = bottom + HUB.gap;
    return { titleY, buttons };
  });
  return { chapters, bottom };
}
