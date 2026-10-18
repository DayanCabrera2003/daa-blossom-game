import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES, type CodexEntryId, type CodexTab, type OpenTabs } from '@levels/codex';
import { codexIndex, type EntryTitles } from './codexIndex';

/** Titles for every entry: `garden C3` and `formal C3`. */
const titles: EntryTitles = new Map(
  CODEX_ENTRIES.map((entry) => [
    entry,
    { gardenTitle: `garden ${entry}`, formalTitle: `formal ${entry}` },
  ]),
);

/** Open tabs from plain data. */
const open = (rows: [CodexEntryId, CodexTab[]][]): OpenTabs =>
  new Map(rows.map(([entry, tabs]) => [entry, new Set(tabs)]));

describe('codexIndex', () => {
  it('lists the fourteen entries in order, the closed ones by their number only', () => {
    const index = codexIndex(open([['C2', ['intuition', 'formal', 'bridge']]]), new Set(), titles);
    expect(index).toHaveLength(14);
    expect(index[0]).toEqual({ kind: 'closed', entry: 'C1', number: 1 });
    expect(index[1]).toEqual({
      kind: 'open',
      entry: 'C2',
      number: 2,
      gardenTitle: 'garden C2',
      formalTitle: 'formal C2',
      tabs: ['intuition', 'formal', 'bridge'],
      isNew: false,
    });
    expect(index[13]).toEqual({ kind: 'closed', entry: 'C14', number: 14 });
  });

  it('keeps the formal title hidden while the formal tab is closed', () => {
    const [first] = codexIndex(open([['C1', ['intuition']]]), new Set(), titles);
    expect(first).toMatchObject({ kind: 'open', formalTitle: null, tabs: ['intuition'] });
  });

  it('seals an entry while any of its open tabs wears the seal', () => {
    const tabs = open([
      ['C1', ['intuition', 'formal', 'bridge']],
      ['C2', ['intuition']],
    ]);
    const index = codexIndex(tabs, new Set(['C1:bridge', 'C2:formal'] as const), titles);
    expect(index.slice(0, 2).map((row) => row.kind === 'open' && row.isNew)).toEqual([true, false]);
  });

  it('an entry with no titles given shows empty titles rather than failing', () => {
    const [first] = codexIndex(open([['C1', ['formal']]]), new Set(), new Map());
    expect(first).toMatchObject({ gardenTitle: '', formalTitle: '' });
  });
});
