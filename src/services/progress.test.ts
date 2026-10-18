import { describe, expect, it } from 'vitest';
import { festivalLevel, secretFlowerLevel } from '../../tests/support/fixtureLevels';
import { catalogEntries, unlockedLevels, visibleLevels } from './progress';
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

/** The synthetic catalog of plan 08: two levels of chapter 1, its secret flower, then chapter 2. */
const withSecret = [
  level('1.1'),
  level('1.2'),
  { id: '1.3', draft: false, secret: { stars: 3 } },
  level('2.1'),
];

describe('the secret flowers in the progress', () => {
  it('winning the last level of a chapter opens the next chapter, never its secret flower', () => {
    const save = recordCompletion(recordCompletion(emptySave(), '1.1', 1), '1.2', 1);
    expect(unlockedLevels(withSecret, save, false)).toEqual(new Set(['1.1', '1.2', '2.1']));
  });

  it('a won secret flower opens nothing after it', () => {
    const save = recordCompletion(emptySave(), '1.3', 2);
    expect(unlockedLevels(withSecret, save, false)).toEqual(new Set(['1.1']));
  });

  it('a secret flower is never a button, not even in teacher mode: it opens from its flower', () => {
    for (const teacherMode of [false, true]) {
      const shown = visibleLevels(withSecret, teacherMode).map((entry) => entry.id);
      expect(shown).toEqual(['1.1', '1.2', '2.1']);
      expect(unlockedLevels(withSecret, emptySave(), teacherMode).has('1.3')).toBe(false);
    }
  });
});

describe('the catalog as the progress reads it', () => {
  it('each level by its id, whether it is a draft, and the stars that open a secret flower', () => {
    expect(catalogEntries([festivalLevel(), secretFlowerLevel()])).toEqual([
      { id: '4.1', draft: false },
      { id: '4.13', draft: false, secret: { stars: 19 } },
    ]);
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
