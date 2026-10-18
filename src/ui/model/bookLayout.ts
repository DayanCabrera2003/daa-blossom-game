/**
 * The measures of a book over the canvas (plan 07, phases 3 and 6), in logical pixels: the same
 * numbers the books' stylesheet lays them out with, times `--px` (tests/bookGeometry.test.ts holds
 * the two together). The head is the book's only row besides the page: over the index the book's
 * name and the arrows that turn its pages, over the page its heading and the way out; the help of
 * the keys sits under the index. The page is the tabs and the text. Knowing them, the room a page leaves to its text is decided here, without the DOM, and
 * so is how far down the page a diagram starts.
 */

/** A width and a height, in logical pixels. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

export const BOOK = {
  /** The book at its fullest, inside a window at least this big. */
  width: 464,
  height: 258,
  /** The wooden frame round the book (the 9-slice of the panel). */
  border: { top: 6, right: 5, bottom: 5, left: 6 },
  /** Inside the frame, round the parts of the book. */
  padding: 4,
  /** Between the head and what is under it, and between the index and the page. */
  gap: 4,
  /** The index, on the left. */
  indexWidth: 176,
  /** A line of the pixel font. */
  line: 13,
  /** The advance of one character of the pixel font (monospaced). */
  glyph: 6,
  /** A row of wooden buttons: a line and the border above and below it (the head). */
  buttonRow: 15,
  /** The row of the tabs: a line and the border on top (they sit on the page, open below). */
  tabRow: 14,
  /** The text of the page: its border and padding. */
  text: { border: 1, padX: 6, padY: 3 },
  /** The space after a paragraph of the text. */
  paragraphGap: 6,
} as const;

/** The book's own size inside a window of `view` logical pixels: as big as it can, no bigger. */
const bookSize = (view: Size): Size => ({
  width: Math.min(view.width, BOOK.width),
  height: Math.min(view.height, BOOK.height),
});

/**
 * The room of the text of a page (inside its border and padding), in logical pixels, when the
 * window is `view` logical pixels big (the screen size over the zoom).
 */
export function pageArea(view: Size): Size {
  const book = bookSize(view);
  const { border, padding, gap, indexWidth, buttonRow, tabRow, text } = BOOK;
  const frameX = border.left + border.right + 2 * padding;
  const frameY = border.top + border.bottom + 2 * padding;
  return {
    width: book.width - frameX - indexWidth - gap - 2 * (text.border + text.padX),
    height: book.height - frameY - buttonRow - gap - tabRow - 2 * (text.border + text.padY),
  };
}

/** How many lines `text` takes when lines hold `perLine` characters and words wrap whole. */
export function linesOf(text: string, perLine: number): number {
  let lines = 0;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const needed = used === 0 ? word.length : used + 1 + word.length;
    if (used > 0 && needed <= perLine) {
      used = needed;
      continue;
    }
    // A new line, and as many more as a word longer than a line needs.
    lines += Math.ceil(word.length / perLine);
    used = word.length % perLine || perLine;
  }
  return lines;
}

/** How far down a page `width` wide the paragraphs `paragraphs` push what follows them. */
export function introHeight(paragraphs: readonly string[], width: number): number {
  const perLine = Math.floor(width / BOOK.glyph);
  return paragraphs.reduce(
    (height, paragraph) => height + linesOf(paragraph, perLine) * BOOK.line + BOOK.paragraphGap,
    0,
  );
}
