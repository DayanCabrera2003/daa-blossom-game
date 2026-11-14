import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { BUTTON_HEIGHT } from './panelLayout';
import { LINE_HEIGHT } from './textWrap';

/**
 * The measures of the victory panel: the 200 × 70 wooden panel it always was when its contents fit
 * there on one middle row, the air it keeps inside and from the canvas's edges, and the heights of
 * its rows (title, then the rows of the stars or the free mode's line, then the buttons). The
 * buttons' top is where they start under a single middle row; each row more pushes them down.
 */
export const VICTORY = {
  minWidth: 200,
  pad: 10,
  margin: 8,
  gap: 6,
  rowGap: 4,
  titleTop: 8,
  lineTop: 26,
  lineHeight: LINE_HEIGHT,
  /** Between a row's star and the words that say what it is for. */
  starGap: 4,
  buttonsTop: 51,
  bottomPad: 5,
} as const;

/** Where the panel and its parts go. */
export interface VictoryLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly titleY: number;
  /** The top of each middle row, in the order given. */
  readonly rows: readonly number[];
  /** The top-left corner of each button, in the order given. */
  readonly buttons: readonly Point[];
}

/** The middle of the panel: how many rows, one under another, and the width of the widest. */
export interface VictoryMiddle {
  readonly width: number;
  readonly rows: number;
}

/**
 * The victory panel laid out round buttons of `widths` (the way back, then the next garden if
 * any) and its `middle` rows (one per star the level can give, or the free mode's line). Its width
 * grows from 200 px until both fit, so no button is ever drawn over another, and its height grows
 * a line for each middle row; buttons that would not fit side by side even on the whole canvas go
 * on rows of their own, centred.
 */
export function victoryLayout(widths: readonly number[], middle: VictoryMiddle): VictoryLayout {
  const widest = CANVAS_WIDTH - 2 * VICTORY.margin;
  const sideBySide = widths.reduce((sum, w) => sum + w, 0) + VICTORY.gap * (widths.length - 1);
  const oneRow = sideBySide <= widest - 2 * VICTORY.pad;
  const buttonsWidth = oneRow ? sideBySide : Math.max(...widths);
  const inner = Math.max(middle.width, buttonsWidth);
  const width = Math.min(widest, Math.max(VICTORY.minWidth, inner + 2 * VICTORY.pad));
  const rows = oneRow ? 1 : widths.length;
  const buttonsTop = VICTORY.buttonsTop + (middle.rows - 1) * VICTORY.lineHeight;
  const height =
    buttonsTop + rows * BUTTON_HEIGHT + (rows - 1) * VICTORY.rowGap + VICTORY.bottomPad;
  const x = Math.floor((CANVAS_WIDTH - width) / 2);
  const y = Math.floor((CANVAS_HEIGHT - height) / 2);
  const top = y + buttonsTop;
  const centred = (w: number): number => x + Math.floor((width - w) / 2);
  const buttons = widths.map((w, i): Point => {
    if (!oneRow) return { x: centred(w), y: top + i * (BUTTON_HEIGHT + VICTORY.rowGap) };
    if (widths.length === 1) return { x: centred(w), y: top };
    // Two side by side: the way back against the left edge, the next garden against the right.
    return { x: i === 0 ? x + VICTORY.pad : x + width - VICTORY.pad - w, y: top };
  });
  const middleRows = Array.from(
    { length: middle.rows },
    (_, i) => y + VICTORY.lineTop + i * VICTORY.lineHeight,
  );
  return { x, y, width, height, titleY: y + VICTORY.titleTop, rows: middleRows, buttons };
}
