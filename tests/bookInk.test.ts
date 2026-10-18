import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WOOD_PANEL } from '@game/picture/wood';
import { PALETTE } from '@game/view/palette';

/**
 * The words the books write straight on their wood (src/ui/book/book.css): the book's name, the
 * titles of the page shown, the notices and the help of the keys. They take the ink the game
 * writes on its wooden panel, the colour `tests/wood.test.ts` holds to the contrast WCAG asks of
 * body text on the very pixels of the panel, never a light colour that melts into the orange.
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

/** The colour the sheet gives a custom property of the book, as a number. */
function token(name: string): number {
  const found = new RegExp(`--${name}:\\s*#([0-9a-f]{6});`).exec(SHEET);
  if (found === null) throw new Error(`no token --${name}`);
  return Number.parseInt(found[1] as string, 16);
}

/** The pieces of text written on the wood, not on the paper of the page or on a button. */
const ON_WOOD = [
  '.book-title',
  '.book-main-title',
  '.book-sub-title',
  '.book-notice',
  '.book-keys',
];

describe('the words of the books written on their wood', () => {
  it('the ink of the book is the ink of the wooden panel', () => {
    expect(token('ink')).toBe(PALETTE[WOOD_PANEL.text]);
  });

  it.each(ON_WOOD)('%s is written in that ink', (selector) => {
    expect(rule(selector)).toMatch(/\n\s*color: var\(--ink\);/);
  });
});
