import { describe, expect, it } from 'vitest';
import { lightLevel } from '../../../tests/support/fixtureLevels';
import { lightDay } from './lightSearch';

// The festival garden: R a b c d e = 0…5, searched from R alone.
const level = lightLevel();

describe('the day of the light searching by itself', () => {
  it('starts at the garden as it is and adds one state per move: R, then a and b, then c and d', () => {
    const day = lightDay(level.start);
    expect(day).toHaveLength(4);
    expect(day[0]).toBe(level.start);
    expect(day.map((state) => state.search?.label ?? null)).toEqual([
      null,
      ['outer', 'none', 'none', 'none', 'none', 'none'],
      ['outer', 'inner', 'outer', 'none', 'none', 'none'],
      ['outer', 'inner', 'outer', 'inner', 'outer', 'none'],
    ]);
    expect(day[3]?.matching).toBe(level.start.matching);
  });

  it('is the garden alone when the light has nothing to look at', () => {
    const searched = lightDay(level.start)[3];
    if (searched === undefined) throw new Error('the light searched');
    expect(lightDay(searched)).toEqual([searched]);
  });
});
