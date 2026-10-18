import { describe, expect, it } from 'vitest';
import { bookRibbons } from './bookRibbons';

describe('the two ribbons of the books', () => {
  it('both books have both ribbons, the Codex first, the open book marked', () => {
    expect(bookRibbons('notebook', true)).toEqual([
      { book: 'codex', current: false, enabled: true },
      { book: 'notebook', current: true, enabled: true },
    ]);
    expect(bookRibbons('codex', true).map((ribbon) => ribbon.current)).toEqual([true, false]);
  });

  it('the Codex ribbon cannot be followed while no page of it is open', () => {
    expect(bookRibbons('notebook', false)[0]).toEqual({
      book: 'codex',
      current: false,
      enabled: false,
    });
  });

  it('the notebook ribbon can always be followed: an empty notebook says how it fills', () => {
    expect(bookRibbons('codex', true)[1]?.enabled).toBe(true);
  });
});
