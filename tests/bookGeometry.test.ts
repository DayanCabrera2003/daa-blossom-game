import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIXEL_FONT } from '@game/picture/pixelFont';
import { BOOK } from '@ui/model/bookLayout';
import { describe, expect, it } from 'vitest';

/**
 * The measures `ui/model/bookLayout.ts` decides with are the ones the books' stylesheet lays them
 * out with (in logical pixels, times `--px`), and the glyph it counts with is the pixel font's.
 */

const SHEET = readFileSync(
  join(import.meta.dirname, '..', 'src', 'ui', 'book', 'book.css'),
  'utf8',
);

/** The declarations of the rule for `selector`, exactly as the sheet writes it. */
function rule(selector: string): string {
  const start = SHEET.indexOf(`\n${selector} {`);
  if (start === -1) throw new Error(`no rule for ${selector}`);
  return SHEET.slice(start, SHEET.indexOf('}', start));
}

/** `n` logical pixels as the sheet writes them. */
const px = (n: number): string => (n === 1 ? 'var(--px)' : `calc(${n} * var(--px))`);

describe('the measures of the book, in its stylesheet', () => {
  it('the book is as big as the model says, with its frame and padding', () => {
    const book = rule('.book');
    expect(book).toContain(`width: min(100vw, ${px(BOOK.width)});`);
    expect(book).toContain(`height: min(100vh, ${px(BOOK.height)});`);
    const { top, right, bottom, left } = BOOK.border;
    expect(book).toContain(`border-width: ${px(top)} ${px(right)} ${px(bottom)} ${px(left)};`);
    expect(book).toContain(`padding: ${px(BOOK.padding)};`);
    expect(book).toContain(`gap: ${px(BOOK.gap)};`);
    expect(book).toContain(`grid-template-columns: ${px(BOOK.indexWidth)} 1fr;`);
    // The head and the page: no other row.
    expect(book).toContain('grid-template-rows: auto minmax(0, 1fr);');
  });

  it('the text of the page has the border and padding the model counts', () => {
    const text = rule('.book-text');
    expect(text).toContain(`padding: ${px(BOOK.text.padY)} ${px(BOOK.text.padX)};`);
    expect(text).toContain(`border: ${px(BOOK.text.border)} solid var(--wood-edge);`);
  });

  it('a line of the book is the line the model counts, and a glyph is the advance of the pixel font', () => {
    expect(rule('.book')).toContain(`line-height: ${px(BOOK.line)};`);
    expect(BOOK.glyph).toBe(PIXEL_FONT.advance);
  });
});
