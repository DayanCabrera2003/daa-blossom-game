import { describe, expect, it } from 'vitest';
import { NO_VERTEX, type AlternatingForest } from './forest';
import { pathToRoot } from './pathToRoot';

// Level 3.1 after walking the fog from R: R sun, a moon, b sun, c moon, d sun (0..4); T (5) unseen.
const walked: AlternatingForest = {
  label: ['outer', 'inner', 'outer', 'inner', 'outer', 'none'],
  parent: [NO_VERTEX, 0, 1, 2, 3, NO_VERTEX],
  root: [0, 0, 0, 0, 0, NO_VERTEX],
};

describe('path to the root', () => {
  it('climbs from a sprout up to the root of its tree', () => {
    expect(pathToRoot(walked, 4)).toEqual([4, 3, 2, 1, 0]);
    expect(pathToRoot(walked, 1)).toEqual([1, 0]);
  });

  it('a root is its own path', () => {
    expect(pathToRoot(walked, 0)).toEqual([0]);
  });

  it('an unreached sprout has no path: asking is a bug', () => {
    expect(() => pathToRoot(walked, 5)).toThrow();
  });
});
