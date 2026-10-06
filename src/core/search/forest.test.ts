import { describe, expect, it } from 'vitest';
import { pathGraph } from '../generators/families';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { NO_VERTEX, plantForest } from './forest';

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const fog = pathGraph(6);
const lanterns = unwrap(
  createMatching(fog, [
    [1, 2],
    [3, 4],
  ]),
);

describe('alternating forest', () => {
  it('plants each root as a sun of its own tree and leaves the rest unmarked', () => {
    const forest = plantForest(lanterns, [0, 5]);
    expect(forest.label).toEqual(['outer', 'none', 'none', 'none', 'none', 'outer']);
    expect(forest.root).toEqual([0, NO_VERTEX, NO_VERTEX, NO_VERTEX, NO_VERTEX, 5]);
    expect(forest.parent).toEqual(new Array(6).fill(NO_VERTEX));
  });

  it('may grow from a single root (the player in the fog starts from one sprout)', () => {
    expect(plantForest(lanterns, [0]).label).toEqual([
      'outer',
      'none',
      'none',
      'none',
      'none',
      'none',
    ]);
  });

  it('refuses a root that already has a lantern: chains only start in the dark', () => {
    expect(() => plantForest(lanterns, [1])).toThrow();
  });

  it('refuses the same root twice', () => {
    expect(() => plantForest(lanterns, [0, 0])).toThrow();
  });
});
