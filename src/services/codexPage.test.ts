import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES, CODEX_TABS } from '@levels/codex';
import { CODEX_PAGES, codexPage, pageOf, pageParts } from './codexPage';

describe('a page of the Codex: one tab of one entry', () => {
  it('is written as the entry and the tab, joined by a colon', () => {
    expect(pageOf('C1', 'formal')).toBe('C1:formal');
    expect(pageOf('C13', 'bridge')).toBe('C13:bridge');
  });

  it('reads back as the entry and the tab it names', () => {
    expect(pageParts('C10:intuition')).toEqual({ entry: 'C10', tab: 'intuition' });
  });

  it('there is one page per tab of each entry, in the order of the book', () => {
    expect(CODEX_PAGES).toHaveLength(CODEX_ENTRIES.length * CODEX_TABS.length);
    expect(CODEX_PAGES.slice(0, 4)).toEqual([
      'C1:intuition',
      'C1:formal',
      'C1:bridge',
      'C2:intuition',
    ]);
    for (const page of CODEX_PAGES) {
      const { entry, tab } = pageParts(page);
      expect(pageOf(entry, tab)).toBe(page);
    }
  });

  it('as saved, only pages of the book are accepted', () => {
    expect(codexPage.parse('C3:bridge')).toBe('C3:bridge');
    for (const wrong of ['C3', 'C15:formal', 'C3:proof', 'C3:formal:x', 'c3:formal', 3]) {
      expect(codexPage.safeParse(wrong).success).toBe(false);
    }
  });
});
