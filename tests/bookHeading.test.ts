import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The heading of a book's page on its one row (src/ui/book/book.css): the garden title of an entry,
 * then its formal title once earned. When both do not fit, the garden title stays whole and only
 * the formal one gives way, cut short with an ellipsis.
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

describe('the heading of a page when it does not fit its row', () => {
  it('never shrinks the garden title: it keeps its whole width', () => {
    const main = rule('.book-main-title');
    expect(main).toMatch(/flex: none;/);
    expect(main).not.toMatch(/min-width: 0/);
    expect(main).not.toMatch(/text-overflow/);
  });

  it('cuts only the formal title, with an ellipsis', () => {
    const sub = rule('.book-sub-title');
    expect(sub).toMatch(/flex: 0 1 auto;/);
    expect(sub).toMatch(/min-width: 0;/);
    expect(sub).toMatch(/text-overflow: ellipsis;/);
  });
});
