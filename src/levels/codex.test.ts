import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES, CODEX_TABS, codexUnlock, unlockedTabs } from './codex';

describe('the Codex entries and how a level opens them', () => {
  it('the book has fourteen entries, C1 to C14, each with three tabs', () => {
    expect(CODEX_ENTRIES).toEqual([
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'C6',
      'C7',
      'C8',
      'C9',
      'C10',
      'C11',
      'C12',
      'C13',
      'C14',
    ]);
    expect(CODEX_TABS).toEqual(['intuition', 'formal', 'bridge']);
  });

  it('a bare entry opens all its tabs', () => {
    const unlock = codexUnlock.parse('C3');
    expect(unlockedTabs(unlock)).toEqual({ entry: 'C3', tabs: ['intuition', 'formal', 'bridge'] });
  });

  it('an entry with tabs opens only those, in the order of the book', () => {
    const unlock = codexUnlock.parse({ entry: 'C1', tabs: ['bridge', 'intuition'] });
    expect(unlockedTabs(unlock)).toEqual({ entry: 'C1', tabs: ['intuition', 'bridge'] });
  });

  it('refuses unknown entries and tabs, empty or repeated tabs, and extra fields', () => {
    for (const wrong of [
      'C0',
      'C15',
      'c3',
      { entry: 'C1', tabs: [] },
      { entry: 'C1', tabs: ['proof'] },
      { entry: 'C1', tabs: ['formal', 'formal'] },
      { entry: 'C1', tabs: ['formal'], note: 'x' },
      { entry: 'C99', tabs: ['formal'] },
    ]) {
      expect(codexUnlock.safeParse(wrong).success).toBe(false);
    }
  });
});
