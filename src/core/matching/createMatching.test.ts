import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { unwrap } from '../shared/result';
import { createMatching, emptyMatching } from './createMatching';

// Path 0-1-2-3.
const path = unwrap(
  createGraph(4, [
    [0, 1],
    [1, 2],
    [2, 3],
  ]),
);

describe('emptyMatching', () => {
  it('leaves every sprout in the dark', () => {
    expect(emptyMatching(path)).toEqual({ mate: [-1, -1, -1, -1] });
  });
});

describe('createMatching', () => {
  it('builds a symmetric mate array', () => {
    expect(
      unwrap(
        createMatching(path, [
          [1, 0],
          [2, 3],
        ]),
      ),
    ).toEqual({ mate: [1, 0, 3, 2] });
  });

  it('rejects a pair that is not a vine', () => {
    expect(createMatching(path, [[0, 2]])).toEqual({
      ok: false,
      error: { code: 'notAnEdge', edge: [0, 2] },
    });
  });

  it('rejects a vertex outside the graph', () => {
    expect(createMatching(path, [[3, 4]])).toEqual({
      ok: false,
      error: { code: 'vertexOutOfRange', edge: [3, 4], vertex: 4 },
    });
  });

  it('rejects a sprout holding two lanterns', () => {
    expect(
      createMatching(path, [
        [0, 1],
        [1, 2],
      ]),
    ).toEqual({ ok: false, error: { code: 'alreadyMatched', edge: [1, 2], vertex: 1 } });
  });
});
