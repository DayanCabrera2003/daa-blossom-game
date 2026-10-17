import { describe, expect, it } from 'vitest';
import { BLOOM } from '../../tests/support/fixtureLevels';
import { checkFlower } from './flowerChecks';
import { loadLevel } from './loader';

/** The flower problems of a level file that must load. */
const problemsOf = (json: unknown) => {
  const level = loadLevel(json);
  if (!level.ok) throw new Error(`level does not load: ${JSON.stringify(level.error)}`);
  return checkFlower(level.value);
};

describe('the flower a level declares', () => {
  it('a flower of the starting lanterns, base first and in the dark, is sound', () => {
    expect(problemsOf(BLOOM)).toEqual([]);
    expect(problemsOf({ ...BLOOM, flower: undefined })).toEqual([]);
  });

  it('must be a flower of the starting garden: an odd loop of vines holding its lanterns', () => {
    expect(problemsOf({ ...BLOOM, flower: ['b', 'c', 'd', 'f'] })).toEqual([
      { code: 'notAFlower', error: { code: 'evenLength', length: 4 } },
    ]);
    expect(problemsOf({ ...BLOOM, flower: ['b', 'c', 'e'] })).toEqual([
      { code: 'notAFlower', error: { code: 'notAdjacent', index: 2 } },
    ]);
  });

  it('its base comes first and is in the dark', () => {
    expect(problemsOf({ ...BLOOM, flower: ['c', 'd', 'f', 'g', 'b'] })).toEqual([
      { code: 'flowerBaseNotFirst', base: 'b' },
    ]);
    // b=c and d=f lit leave g as the base, then lit with t.
    const litBase = {
      ...BLOOM,
      lanterns: [
        ['b', 'c'],
        ['d', 'f'],
        ['g', 't'],
        ['h', 'x'],
      ],
      flower: ['g', 'b', 'c', 'd', 'f'],
    };
    expect(problemsOf(litBase)).toEqual([{ code: 'flowerBaseLit', base: 'g' }]);
  });

  it('keeps every sprout in the left half, so the folded garden fits beside it', () => {
    const sprouts = BLOOM.sprouts.map((s) => (s.label === 't' ? { ...s, x: 300 } : s));
    expect(problemsOf({ ...BLOOM, sprouts })).toEqual([{ code: 'flowerOffSide', sprout: 't' }]);
  });
});
