import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { InvariantError } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { createMatching } from './createMatching';
import { exposedVertices, isExposed, isMatchedEdge, matchedEdges, mateOf, size } from './queries';

// Path 0-1-2-3-4 with lanterns 1=2 and 3=4; sprout 0 sleeps in the dark.
const graph = unwrap(
  createGraph(5, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
  ]),
);
const matching = unwrap(
  createMatching(graph, [
    [4, 3],
    [1, 2],
  ]),
);

describe('matching queries', () => {
  it('size counts lit lanterns', () => {
    expect(size(matching)).toBe(2);
  });

  it('mateOf returns the partner or -1', () => {
    expect(mateOf(matching, 2)).toBe(1);
    expect(mateOf(matching, 0)).toBe(-1);
  });

  it('mateOf rejects a vertex outside the matching', () => {
    expect(() => mateOf(matching, 5)).toThrow(InvariantError);
  });

  it('isExposed tells whether a sprout sleeps in the dark', () => {
    expect(isExposed(matching, 0)).toBe(true);
    expect(isExposed(matching, 3)).toBe(false);
  });

  it('exposedVertices lists the sprouts in the dark in ascending order', () => {
    expect(exposedVertices(matching)).toEqual([0]);
  });

  it('matchedEdges lists lit pairs normalized and sorted', () => {
    expect(matchedEdges(matching)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('isMatchedEdge ignores orientation', () => {
    expect(isMatchedEdge(matching, 2, 1)).toBe(true);
    expect(isMatchedEdge(matching, 2, 3)).toBe(false);
  });
});
