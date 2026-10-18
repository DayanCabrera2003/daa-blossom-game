import strings from '@content/es/strings.json';
import { BOOK } from '@ui/model/bookLayout';
import { describe, expect, it } from 'vitest';

const table: Record<string, string> = strings;

/** How many characters of the monospaced pixel font fit across the index column of a book. */
const COLUMN = Math.floor(BOOK.indexWidth / BOOK.glyph);

describe('the help of the keys under the index of a book', () => {
  it.each(['codex.keys', 'notebook.book.keys'])(
    '%s: every line fits the index column whole, so the page never splits a group',
    (key) => {
      const lines = (table[key] ?? '').split('\n');
      for (const line of lines) expect([...line].length).toBeLessThanOrEqual(COLUMN);
    },
  );

  it('the Codex breaks its help on purpose: the keys of the page, then those of the tabs', () => {
    expect((table['codex.keys'] ?? '').split('\n')).toEqual([
      'Esc cierra   ← → página',
      '1 2 3 cambian de pestaña',
    ]);
  });
});
