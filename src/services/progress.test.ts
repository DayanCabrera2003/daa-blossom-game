import { describe, expect, it } from 'vitest';
import { unlockedLevels, visibleLevels } from './progress';
import { emptySave, recordCompletion } from './save';

/** A catalog entry that is not a draft. */
const level = (id: string) => ({ id, draft: false });

const levels = ['0.1', '1.1', '4.1', '4.9', '4.10', '5.1'].map(level);
const ids = levels.map((entry) => entry.id);

/** The synthetic catalog of the plan: two finished levels, then two drafts. */
const withDrafts = [
  level('0.1'),
  level('0.2'),
  { id: '4.1', draft: true },
  { id: '4.2', draft: true },
];

describe('which levels are open', () => {
  it('a new player can only play the first level', () => {
    expect(unlockedLevels(levels, emptySave(), false)).toEqual(new Set(['0.1']));
  });

  it('completing a level opens the next one in catalog order, across chapters', () => {
    const save = recordCompletion(recordCompletion(emptySave(), '0.1', 1), '4.10', 1);
    expect(unlockedLevels(levels, save, false)).toEqual(new Set(['0.1', '1.1', '4.10', '5.1']));
  });

  it('a completed level stays open', () => {
    const save = recordCompletion(emptySave(), '4.1', 2);
    expect(unlockedLevels(levels, save, false).has('4.1')).toBe(true);
  });

  it('completing the last level opens nothing beyond the catalog', () => {
    const save = recordCompletion(emptySave(), '5.1', 3);
    expect(unlockedLevels(levels, save, false)).toEqual(new Set(['0.1', '5.1']));
  });

  it('teacher mode opens everything', () => {
    expect(unlockedLevels(levels, emptySave(), true)).toEqual(new Set(ids));
  });

  it('an empty catalog opens nothing', () => {
    expect(unlockedLevels([], emptySave(), false)).toEqual(new Set());
  });

  it('completing the last finished level does not open the drafts after it', () => {
    const save = recordCompletion(recordCompletion(emptySave(), '0.1', 3), '0.2', 3);
    expect(unlockedLevels(withDrafts, save, false)).toEqual(new Set(['0.1', '0.2']));
  });

  it('a draft completed in teacher mode neither opens nor opens the next one for a player', () => {
    const save = recordCompletion(emptySave(), '4.1', 3);
    expect(unlockedLevels(withDrafts, save, false)).toEqual(new Set(['0.1']));
  });

  it('a draft is skipped: finishing the level before it opens the level after it', () => {
    const catalog = [level('0.1'), { id: '4.1', draft: true }, level('5.1')];
    const save = recordCompletion(emptySave(), '0.1', 1);
    expect(unlockedLevels(catalog, save, false)).toEqual(new Set(['0.1', '5.1']));
  });

  it('teacher mode opens the drafts too', () => {
    expect(unlockedLevels(withDrafts, emptySave(), true)).toEqual(
      new Set(['0.1', '0.2', '4.1', '4.2']),
    );
  });
});

describe('which levels are shown', () => {
  it('a player never sees the drafts', () => {
    expect(visibleLevels(withDrafts, false).map((entry) => entry.id)).toEqual(['0.1', '0.2']);
  });

  it('teacher mode shows every level, in catalog order', () => {
    expect(visibleLevels(withDrafts, true)).toEqual(withDrafts);
  });
});
