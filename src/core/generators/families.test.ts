import { describe, expect, it } from 'vitest';
import { allPairs } from '../../../tests/support/arbitraries';
import { degree } from '../graph/queries';
import { completeGraph, cycleGraph, pathGraph, starGraph } from './families';

describe('graph families', () => {
  it('a path chains its sprouts in order', () => {
    expect(pathGraph(4).edges).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
  });

  it('a path of one or zero sprouts has no vines', () => {
    expect(pathGraph(1)).toMatchObject({ n: 1, edges: [] });
    expect(pathGraph(0)).toMatchObject({ n: 0, edges: [] });
  });

  it('a cycle closes the path back to the first sprout', () => {
    expect(cycleGraph(5).edges).toEqual([
      [0, 1],
      [0, 4],
      [1, 2],
      [2, 3],
      [3, 4],
    ]);
  });

  it('a cycle needs at least three sprouts', () => {
    expect(() => cycleGraph(2)).toThrow();
  });

  it('a star joins a center (vertex 0) to every leaf', () => {
    const star = starGraph(3);
    expect(star.n).toBe(4);
    expect(star.edges).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    expect(degree(star, 0)).toBe(3);
  });

  it('a complete garden has a vine between every pair of sprouts', () => {
    expect(completeGraph(5).edges).toEqual(allPairs(5));
  });

  it('rejects negative or fractional sizes', () => {
    expect(() => pathGraph(-1)).toThrow();
    expect(() => completeGraph(2.5)).toThrow();
    expect(() => starGraph(-1)).toThrow();
  });
});
