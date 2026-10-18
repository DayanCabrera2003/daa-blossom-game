import { fontMetrics, PIXEL_FONT } from './pixelFont';

/**
 * How a text wraps in the pixel font, the way the engine wraps it: word by word, greedily, a word
 * longer than the line on a line of its own. The font is monospaced, so a width is a number of
 * letters. The layouts of the panels use it to know how tall their texts are, and the tests to
 * prove that every text of the game fits the panel it is shown in.
 */

/** The height of a line of body text. */
export const LINE_HEIGHT = fontMetrics(8).fontSize;

/** How many letters of body text fit in `width` pixels. */
export const charsIn = (width: number): number => Math.floor(width / PIXEL_FONT.advance);

/** How many lines `text` takes when wrapped at `chars` letters. */
export function wrappedLines(text: string, chars: number): number {
  let count = 1;
  let used = 0;
  for (const word of text.split(' ')) {
    const length = [...word].length;
    const needed = used === 0 ? length : used + 1 + length;
    if (needed <= chars || used === 0) used = needed;
    else {
      count += 1;
      used = length;
    }
  }
  return count;
}

/** The height of `text` wrapped at `width` pixels. */
export const textHeight = (text: string, width: number): number =>
  wrappedLines(text, charsIn(width)) * LINE_HEIGHT;
