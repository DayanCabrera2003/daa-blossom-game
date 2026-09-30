import { describe, expect, it } from 'vitest';
import { unwrap } from '../shared/result';
import { createGraph } from './createGraph';

describe('createGraph', () => {
  it('builds the empty graph', () => {
    expect(unwrap(createGraph(0, []))).toEqual({ n: 0, edges: [], adjacency: [] });
  });

  it('keeps isolated vertices', () => {
    expect(unwrap(createGraph(3, [])).adjacency).toEqual([[], [], []]);
  });

  it('normalizes edge orientation and sorts edges', () => {
    const graph = unwrap(
      createGraph(4, [
        [3, 1],
        [0, 2],
        [1, 0],
      ]),
    );
    expect(graph.edges).toEqual([
      [0, 1],
      [0, 2],
      [1, 3],
    ]);
  });

  it('builds sorted adjacency lists in both directions', () => {
    const graph = unwrap(
      createGraph(4, [
        [2, 0],
        [0, 1],
        [3, 0],
      ]),
    );
    expect(graph.adjacency).toEqual([[1, 2, 3], [0], [0], [0]]);
  });

  it.each([-1, 1.5, Number.NaN])('rejects the vertex count %s', (n) => {
    expect(createGraph(n, [])).toEqual({ ok: false, error: { code: 'invalidVertexCount', n } });
  });

  it('rejects a vertex outside 0..n-1', () => {
    expect(createGraph(2, [[0, 2]])).toEqual({
      ok: false,
      error: { code: 'vertexOutOfRange', edge: [0, 2], vertex: 2 },
    });
  });

  it('rejects a non-integer vertex', () => {
    expect(createGraph(3, [[0.5, 1]])).toEqual({
      ok: false,
      error: { code: 'vertexOutOfRange', edge: [0.5, 1], vertex: 0.5 },
    });
  });

  it('rejects a self-loop', () => {
    expect(createGraph(2, [[1, 1]])).toEqual({ ok: false, error: { code: 'selfLoop', vertex: 1 } });
  });

  it('rejects a duplicate edge, whatever its orientation', () => {
    expect(
      createGraph(2, [
        [0, 1],
        [1, 0],
      ]),
    ).toEqual({ ok: false, error: { code: 'duplicateEdge', edge: [0, 1] } });
  });
});
