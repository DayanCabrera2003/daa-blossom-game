import type { PixelRect } from '../assets/frames';
import type { Point } from '../input/target';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../scale/integerZoom';
import { PORTRAIT_BOX } from './portrait';
import { LINE_HEIGHT } from './textWrap';
import { WOOD_DIALOGUE } from './wood';

/**
 * Where the dialogue box sits and what goes where in it (plan 06, phase 5): the wooden box over the
 * bottom of the garden, the speaker's name on its tab, the portrait in its frame on the left of the
 * page, the text in the room that leaves, and the "continue" hint under the text. The box is the
 * same whoever speaks; only the text narrows beside a portrait. `tests/dialogueFit.test.ts` proves
 * that the longest line of each speaker fits its rows.
 */

/** The rows of text the box holds: the longest line of the mentor, beside his portrait. */
export const DIALOGUE_ROWS = 4;

/** The side borders of the page under the tab, and the air between the page's parts. */
const SIDE = 6;
const PAD = 2;
/** Between the portrait's frame and the text. */
const PORTRAIT_GAP = 6;
/** The box spans the canvas but for this margin on each side, and ends above the toolbar. */
const MARGIN = 16;
const BOTTOM = CANVAS_HEIGHT - 29;

/** The parts of the box, in canvas pixels. */
export interface DialogueBoxLayout {
  /** The wooden box itself, tab included. */
  readonly box: PixelRect;
  /** Where the speaker's name is written, on the tab. */
  readonly tab: PixelRect;
  /** The top-left corner of the portrait's frame, or null when the speaker has none. */
  readonly portrait: Point | null;
  /** Where the text wraps, as tall as its rows. */
  readonly text: PixelRect;
  /** The bottom-right corner of the "continue" hint. */
  readonly hint: Point;
}

/** The box, with room for a portrait or without it. */
export function dialogueBox(withPortrait: boolean): DialogueBoxLayout {
  const { top, bottom, right } = WOOD_DIALOGUE.slices;
  const rows = DIALOGUE_ROWS * LINE_HEIGHT;
  const content = Math.max(rows, PORTRAIT_BOX.size);
  const height = top + PAD + content + LINE_HEIGHT + PAD + bottom;
  const box = { x: MARGIN, y: BOTTOM - height, width: CANVAS_WIDTH - 2 * MARGIN, height };
  const left = box.x + SIDE + PAD;
  const contentTop = box.y + top + PAD;
  const textLeft = withPortrait ? left + PORTRAIT_BOX.size + PORTRAIT_GAP : left;
  const textRight = box.x + box.width - right - PAD;
  const { tab } = WOOD_DIALOGUE;
  return {
    box,
    tab: { x: box.x + tab.x, y: box.y + tab.y, width: tab.width, height: tab.height },
    portrait: withPortrait ? { x: left, y: contentTop } : null,
    text: { x: textLeft, y: contentTop, width: textRight - textLeft, height: rows },
    hint: { x: textRight, y: contentTop + content + LINE_HEIGHT },
  };
}
