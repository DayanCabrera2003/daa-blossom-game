import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES, type CodexEntryId, type CodexUnlock } from './codex';
import { checkCodex, type CodexLevel } from './codexChecks';

/** A level of a made-up catalog: what it opens, and the entries its notebook questions link to. */
const level = (
  id: string,
  codex: readonly CodexUnlock[],
  links: readonly CodexEntryId[] = [],
  draft = false,
): CodexLevel => ({
  id,
  draft,
  unlocks: { codex },
  notebook: links.length === 0 ? undefined : links.map((entry) => ({ codex: entry })),
});

/** A last level that opens every entry not named before, so only the case under test fails. */
const theRest = (id: string, named: readonly CodexEntryId[]): CodexLevel =>
  level(
    id,
    CODEX_ENTRIES.filter((entry) => !named.includes(entry)),
  );

describe('the Codex checks of the whole catalog', () => {
  it('a catalog that opens every entry whole, and links forward, is sound', () => {
    const levels = [
      level('0.5', [{ entry: 'C1', tabs: ['intuition'] }]),
      level('1.5', [], ['C2']),
      level('1.8', ['C1', 'C2']),
      theRest('7.5', ['C1', 'C2']),
    ];
    expect(checkCodex(levels)).toEqual([]);
  });

  it('every entry opens whole somewhere; tabs opened by several levels add up', () => {
    const levels = [
      level('0.5', [{ entry: 'C1', tabs: ['intuition'] }]),
      level('1.8', [{ entry: 'C1', tabs: ['formal', 'bridge'] }]),
      level('2.1', [{ entry: 'C2', tabs: ['formal'] }]),
      theRest('7.5', ['C1', 'C2', 'C3']),
    ];
    expect(checkCodex(levels)).toEqual([
      { code: 'codexNeverWhole', entry: 'C2' },
      { code: 'codexNeverWhole', entry: 'C3' },
    ]);
  });

  it('a draft never opens anything for the player', () => {
    const levels = [level('1.1', ['C2'], [], true), theRest('7.5', ['C2'])];
    expect(checkCodex(levels)).toEqual([{ code: 'codexNeverWhole', entry: 'C2' }]);
  });

  it('no entry opens in part after it opened whole, even within the same level', () => {
    const levels = [
      level('1.8', ['C1']),
      level('2.1', [{ entry: 'C1', tabs: ['intuition'] }]),
      level('2.2', ['C1']),
      theRest('7.5', ['C1']),
    ];
    expect(checkCodex(levels)).toEqual([
      { code: 'codexPartAfterWhole', entry: 'C1', level: '2.1' },
    ]);
    const same = [level('1.8', ['C1', { entry: 'C1', tabs: ['formal'] }]), theRest('7.5', ['C1'])];
    expect(checkCodex(same)).toEqual([{ code: 'codexPartAfterWhole', entry: 'C1', level: '1.8' }]);
  });

  it('a notebook question links to an entry opened whole at its level or later, never before', () => {
    const levels = [
      level('1.8', ['C2'], ['C2']),
      level('2.4', [], ['C2', 'C3']),
      theRest('7.5', ['C2']),
    ];
    expect(checkCodex(levels)).toEqual([
      { code: 'notebookLinkBehind', level: '2.4', question: 0, entry: 'C2', opensAt: '1.8' },
    ]);
  });

  it('reads the catalog in play order, whatever order the levels come in', () => {
    const levels = [
      theRest('7.5', ['C1']),
      level('1.8', ['C1'], ['C1']),
      level('0.5', [{ entry: 'C1', tabs: ['intuition'] }]),
    ];
    expect(checkCodex(levels)).toEqual([]);
  });

  it('a link to an entry that never opens whole is told once, as the entry never opening', () => {
    const levels = [level('1.5', [], ['C2']), theRest('7.5', ['C2'])];
    expect(checkCodex(levels)).toEqual([{ code: 'codexNeverWhole', entry: 'C2' }]);
  });
});
