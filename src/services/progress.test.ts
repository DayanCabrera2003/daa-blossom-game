import { describe, expect, it } from 'vitest';
import { unlockedLevels } from './progress';
import { emptySave, recordCompletion } from './save';

const ids = ['0.1', '1.1', '4.1', '4.9', '4.10', '5.1'];

describe('which levels are open', () => {
  it('a new player can only play the first level', () => {
    expect(unlockedLevels(ids, emptySave(), false)).toEqual(new Set(['0.1']));
  });

  it('completing a level opens the next one in catalog order, across chapters', () => {
    const save = recordCompletion(recordCompletion(emptySave(), '0.1', 1), '4.10', 1);
    expect(unlockedLevels(ids, save, false)).toEqual(new Set(['0.1', '1.1', '4.10', '5.1']));
  });

  it('a completed level stays open', () => {
    const save = recordCompletion(emptySave(), '4.1', 2);
    expect(unlockedLevels(ids, save, false).has('4.1')).toBe(true);
  });

  it('completing the last level opens nothing beyond the catalog', () => {
    const save = recordCompletion(emptySave(), '5.1', 3);
    expect(unlockedLevels(ids, save, false)).toEqual(new Set(['0.1', '5.1']));
  });

  it('teacher mode opens everything', () => {
    expect(unlockedLevels(ids, emptySave(), true)).toEqual(new Set(ids));
  });

  it('an empty catalog opens nothing', () => {
    expect(unlockedLevels([], emptySave(), false)).toEqual(new Set());
  });
});
