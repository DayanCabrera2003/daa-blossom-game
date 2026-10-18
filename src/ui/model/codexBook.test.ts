import { describe, expect, it } from 'vitest';
import type { CodexEntryId, CodexTab, OpenTabs } from '@levels/codex';
import type { CodexPage } from '@services/codexPage';
import {
  canTurn,
  chooseTab,
  endPage,
  followLink,
  moveTo,
  openBook,
  turnPage,
  type BookState,
} from './codexBook';

/** Open tabs from plain data. */
const open = (rows: [CodexEntryId, CodexTab[]][]): OpenTabs =>
  new Map(rows.map(([entry, tabs]) => [entry, new Set(tabs)]));

const ALL: CodexTab[] = ['intuition', 'formal', 'bridge'];
const book = open([
  ['C1', ALL],
  ['C2', ['intuition']],
  ['C13', ALL],
]);
const pages = (...list: CodexPage[]): Set<CodexPage> => new Set(list);

describe('where the Codex opens', () => {
  it('with nothing open there is no book to open', () => {
    expect(openBook(open([]), pages())).toBeNull();
  });

  it('opens at the first unread page, in the order of the book', () => {
    const state = openBook(book, pages('C1:bridge', 'C13:intuition'));
    expect(state?.place).toEqual({ entry: 'C1', tab: 'bridge' });
    expect([...(state?.sealed ?? [])]).toEqual(['C1:bridge', 'C13:intuition']);
  });

  it('with everything read, opens at the first tab of the first entry', () => {
    expect(openBook(book, pages())?.place).toEqual({ entry: 'C1', tab: 'intuition' });
  });

  it('opens at the entry asked for, if it is open, at its first unread tab', () => {
    expect(openBook(book, pages('C1:bridge', 'C13:formal'), 'C13')?.place).toEqual({
      entry: 'C13',
      tab: 'formal',
    });
    expect(openBook(book, pages(), 'C13')?.place).toEqual({ entry: 'C13', tab: 'intuition' });
    // A closed or unknown entry is no place to open: the book opens as usual.
    expect(openBook(book, pages(), 'C5')?.place.entry).toBe('C1');
    expect(openBook(book, pages(), 'C99')?.place.entry).toBe('C1');
  });
});

describe('turning the pages of the Codex', () => {
  const at = (entry: CodexEntryId, tab: CodexTab): BookState => ({
    place: { entry, tab },
    sealed: pages(),
  });

  it('goes to the next or previous open entry, skipping the closed ones', () => {
    expect(turnPage(book, at('C2', 'intuition'), 1)).toEqual({ entry: 'C13', tab: 'intuition' });
    expect(turnPage(book, at('C13', 'intuition'), -1)).toEqual({ entry: 'C2', tab: 'intuition' });
  });

  it('keeps the tab when the next entry has it open, or else opens its first tab', () => {
    expect(turnPage(book, at('C13', 'formal'), -1)).toEqual({ entry: 'C2', tab: 'intuition' });
    expect(turnPage(book, at('C2', 'intuition'), -1)).toEqual({ entry: 'C1', tab: 'intuition' });
    expect(turnPage(book, at('C1', 'bridge'), 1)).toEqual({ entry: 'C2', tab: 'intuition' });
    expect(
      turnPage(
        open([
          ['C1', ALL],
          ['C3', ALL],
        ]),
        at('C1', 'bridge'),
        1,
      ),
    ).toEqual({
      entry: 'C3',
      tab: 'bridge',
    });
  });

  it('stops at either end of the book', () => {
    expect(turnPage(book, at('C1', 'formal'), -1)).toBeNull();
    expect(turnPage(book, at('C13', 'formal'), 1)).toBeNull();
    expect(canTurn(book, at('C1', 'formal'), -1)).toBe(false);
    expect(canTurn(book, at('C1', 'formal'), 1)).toBe(true);
  });

  it('goes to the first or the last open entry, unless it is there already', () => {
    expect(endPage(book, at('C2', 'intuition'), 1)).toEqual({ entry: 'C13', tab: 'intuition' });
    expect(endPage(book, at('C13', 'bridge'), -1)).toEqual({ entry: 'C1', tab: 'bridge' });
    expect(endPage(book, at('C13', 'bridge'), 1)).toBeNull();
    expect(endPage(book, at('C1', 'formal'), -1)).toBeNull();
    expect(endPage(book, at('C13', 'bridge'), -1)).not.toBeNull();
    expect(
      endPage(
        open([
          ['C1', ALL],
          ['C2', ['intuition']],
        ]),
        at('C1', 'formal'),
        1,
      ),
    ).toEqual({
      entry: 'C2',
      tab: 'intuition',
    });
  });

  it('follows a link to an open entry, to its formal tab for a result', () => {
    expect(followLink(book, at('C1', 'bridge'), 'C13', null)).toEqual({
      entry: 'C13',
      tab: 'bridge',
    });
    expect(followLink(book, at('C1', 'bridge'), 'C13', 'T13.2')).toEqual({
      entry: 'C13',
      tab: 'formal',
    });
    expect(followLink(book, at('C1', 'formal'), 'C2', 'D2.1')).toEqual({
      entry: 'C2',
      tab: 'intuition',
    });
  });

  it('a link to a closed entry leads nowhere', () => {
    expect(followLink(book, at('C1', 'formal'), 'C8', null)).toBeNull();
    expect(followLink(book, at('C1', 'formal'), 'C99', 'T1.1')).toBeNull();
  });

  it('chooses only a tab that is open', () => {
    expect(chooseTab(book, at('C1', 'intuition'), 'bridge')).toEqual({
      entry: 'C1',
      tab: 'bridge',
    });
    expect(chooseTab(book, at('C2', 'intuition'), 'formal')).toBeNull();
  });

  it('a page keeps its seal while it is read, and loses it once left', () => {
    const start = openBook(book, pages('C1:intuition', 'C1:formal'));
    expect(start?.sealed.has('C1:intuition')).toBe(true);
    const next = moveTo(start as BookState, { entry: 'C1', tab: 'formal' });
    expect([...next.sealed]).toEqual(['C1:formal']);
    expect(next.place).toEqual({ entry: 'C1', tab: 'formal' });
    expect(moveTo(next, { entry: 'C1', tab: 'formal' })).toBe(next);
    expect(moveTo(next, { entry: 'C2', tab: 'intuition' }).sealed.size).toBe(0);
  });
});
