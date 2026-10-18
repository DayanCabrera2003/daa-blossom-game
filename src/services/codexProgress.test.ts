import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import { CODEX_ENTRIES, CODEX_TABS, type OpenTabs } from '@levels/codex';
import {
  codexSources,
  GLOSSARY_ENTRIES,
  hasNewPages,
  markRead,
  openCodex,
  pagesOpened,
  unreadPages,
} from './codexProgress';
import { emptySave, recordCompletion, recordPageRead, type SaveData } from './save';

/** The real catalog, as the progress reads it. */
const levels = codexSources(catalog());

/** A save that completed `ids`, each with one star. */
const completed = (...ids: string[]): SaveData =>
  ids.reduce((save, id) => recordCompletion(save, id, 1), emptySave());

/** The open tabs as plain data, entries in the order the map gives them. */
const plain = (open: OpenTabs) => [...open].map(([entry, tabs]) => [entry, [...tabs]]);

describe('what the Codex shows open', () => {
  it('with nothing completed, no entry is open', () => {
    expect(openCodex(levels, emptySave(), false).size).toBe(0);
  });

  it('winning 0.5 opens only the intuition of C1', () => {
    expect(plain(openCodex(levels, completed('0.5'), false))).toEqual([['C1', ['intuition']]]);
  });

  it('winning 1.8 opens C1 whole, the chain and the glossary, in the order of the book', () => {
    expect(plain(openCodex(levels, completed('0.5', '1.8'), false))).toEqual([
      ['C1', ['intuition', 'formal', 'bridge']],
      ['C2', ['intuition', 'formal', 'bridge']],
      ['C13', ['intuition', 'formal', 'bridge']],
    ]);
  });

  it('winning every level opens the fourteen entries with their three tabs', () => {
    const all = completed(...levels.map((level) => level.id));
    const open = openCodex(levels, all, false);
    expect([...open.keys()]).toEqual(CODEX_ENTRIES);
    for (const tabs of open.values()) expect([...tabs]).toEqual(CODEX_TABS);
  });

  it('teacher mode opens the whole book without completing anything', () => {
    const open = openCodex(levels, emptySave(), true);
    expect([...open.keys()]).toEqual(CODEX_ENTRIES);
    for (const tabs of open.values()) expect([...tabs]).toEqual(CODEX_TABS);
  });
});

describe('the new pages', () => {
  it('every open tab is new until the player reads it, page by page', () => {
    const save = completed('0.5', '1.8');
    const open = openCodex(levels, save, false);
    expect([...unreadPages(open, save)]).toHaveLength(9);
    const read = recordPageRead(save, 'C2:formal');
    expect(unreadPages(open, read).has('C2:formal')).toBe(false);
    expect(unreadPages(open, read).has('C2:intuition')).toBe(true);
  });

  it('a tab that opens after its entry was read is new: the formal of C1 at 1.8', () => {
    const early = completed('0.5');
    const read = markRead(early, 'C1:intuition', openCodex(levels, early, false));
    expect([...unreadPages(openCodex(levels, read, false), read)]).toEqual([]);
    const later = recordCompletion(read, '1.8', 1);
    const unread = unreadPages(openCodex(levels, later, false), later);
    expect(unread.has('C1:intuition')).toBe(false);
    expect(unread.has('C1:formal')).toBe(true);
    expect(unread.has('C1:bridge')).toBe(true);
  });

  it('a page read in teacher mode and then closed again is not new, nor listed', () => {
    const save = recordPageRead(emptySave(), 'C8:formal');
    expect([...unreadPages(openCodex(levels, save, false), save)]).toEqual([]);
  });

  it('the glossary is new again when an entry with rows opens after it was read', () => {
    const save = completed('0.5', '1.8');
    const open = openCodex(levels, save, false);
    const read = CODEX_TABS.reduce((saved, tab) => markRead(saved, `C13:${tab}`, open), save);
    expect(read.glossaryRead).toEqual(['C1', 'C2']);
    expect(unreadPages(open, read).has('C13:bridge')).toBe(false);
    // Winning 2.4 opens C3, whose rows join the glossary: only its bridge, where they show, is new.
    const later = recordCompletion(read, '2.4', 1);
    const unread = unreadPages(openCodex(levels, later, false), later);
    expect(unread.has('C13:bridge')).toBe(true);
    expect(unread.has('C13:formal')).toBe(false);
    expect(unread.has('C3:intuition')).toBe(true);
  });

  it('reading another page records no glossary rows, and the rows come from C1 to C12', () => {
    const save = completed('0.5', '1.8');
    expect(markRead(save, 'C13:formal', openCodex(levels, save, false)).glossaryRead).toEqual([]);
    expect(GLOSSARY_ENTRIES).toEqual(CODEX_ENTRIES.slice(0, 12));
  });

  it('a win opens pages when it opens a tab not open before', () => {
    const before = openCodex(levels, completed('0.5'), false);
    expect(pagesOpened(before, openCodex(levels, completed('0.5', '1.8'), false))).toBe(true);
    expect(pagesOpened(openCodex(levels, emptySave(), false), before)).toBe(true);
    expect(pagesOpened(before, openCodex(levels, completed('0.5', '1.1'), false))).toBe(false);
    expect(pagesOpened(before, before)).toBe(false);
  });

  it('the book has news while some open tab is unread, the glossary rows too', () => {
    expect(hasNewPages(openCodex(levels, emptySave(), false), emptySave())).toBe(false);
    const save = completed('0.5');
    const open = openCodex(levels, save, false);
    expect(hasNewPages(open, save)).toBe(true);
    const read = markRead(save, 'C1:intuition', open);
    expect(hasNewPages(open, read)).toBe(false);
    // Winning 1.8 opens more tabs: news again until each is read.
    const later = recordCompletion(read, '1.8', 1);
    expect(hasNewPages(openCodex(levels, later, false), later)).toBe(true);
    expect(hasNewPages(openCodex(levels, emptySave(), true), emptySave())).toBe(true);
  });
});
