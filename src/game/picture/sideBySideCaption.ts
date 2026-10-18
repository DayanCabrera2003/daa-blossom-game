import type { PixelRect } from '../assets/frames';
import { CANVAS_WIDTH } from '../scale/integerZoom';
import { LAYOUT } from '../view/layout';
import { PIXEL_FONT } from './pixelFont';
import { charsIn, LINE_HEIGHT, wrapText } from './textWrap';

/**
 * Where the caption of the flower challenge goes (GDD 4.11): across the top of both gardens, just
 * under the top bar, centred, wrapped a little short of the canvas's edges. Its dark backing fills
 * the box of its text, so `tests/sideBySideCaption.test.ts` proves that no caption of the challenge
 * covers a sprout or a name of either garden (plan 09, decision on phase 10).
 */
export const CAPTION = {
  top: LAYOUT.garden.y,
  wrap: CANVAS_WIDTH - 16,
} as const;

/** The box a caption fills: its lines wrapped at `CAPTION.wrap`, centred across the canvas. */
export function captionBox(text: string): PixelRect {
  const lines = wrapText(text, charsIn(CAPTION.wrap));
  const width = Math.max(...lines.map((line) => [...line].length)) * PIXEL_FONT.advance;
  return {
    x: Math.round((CANVAS_WIDTH - width) / 2),
    y: CAPTION.top,
    width,
    height: lines.length * LINE_HEIGHT,
  };
}
