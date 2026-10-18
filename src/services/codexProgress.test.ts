import { describe, expect, it } from 'vitest';
import { catalog } from '@levels/catalog';
import { CODEX_ENTRIES, CODEX_TABS, type OpenTabs } from '@levels/codex';
import { codexSources, newEntries, openCodex, pagesOpened } from './codexProgress';
import { emptySave, recordCodexRead, recordCompletion, type SaveData } from './save';

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
  it('an open entry is new until the player reads it', () => {
    const save = completed('0.5', '1.8');
    const open = openCodex(levels, save, false);
    expect(newEntries(open, save)).toEqual(['C1', 'C2', 'C13']);
    expect(newEntries(open, recordCodexRead(save, 'C2'))).toEqual(['C1', 'C13']);
  });

  it('an entry read in teacher mode and then closed again is not new, nor listed', () => {
    const save = recordCodexRead(emptySave(), 'C8');
    expect(newEntries(openCodex(levels, save, false), save)).toEqual([]);
  });

  it('a win opens pages when it opens a tab not open before', () => {
    const before = openCodex(levels, completed('0.5'), false);
    expect(pagesOpened(before, openCodex(levels, completed('0.5', '1.8'), false))).toBe(true);
    expect(pagesOpened(openCodex(levels, emptySave(), false), before)).toBe(true);
    expect(pagesOpened(before, openCodex(levels, completed('0.5', '1.1'), false))).toBe(false);
    expect(pagesOpened(before, before)).toBe(false);
  });
});
