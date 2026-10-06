import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bipartiteWithMatchingArb } from '../../../tests/support/arbitraries';
import { cycleGraph, pathGraph, starGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import { bipartiteMatching } from '../search/bipartiteMatching';
import { checkVertexCover, koenigCover } from './vertexCover';

// Level 3.7, part I: 1–2–3–4–5 as 0..4. Part II: the star H–L1, H–L2, H–L3.
const path = pathGraph(5);
const star = starGraph(3);

describe('vertex cover (scarecrows)', () => {
  it('scarecrows on 2 and 4 guard every vine of the path (level 3.7)', () => {
    expect(checkVertexCover(path, [1, 3])).toEqual({ ok: true, value: [1, 3] });
  });

  it('one scarecrow on the center guards the whole star', () => {
    expect(checkVertexCover(star, [0]).ok).toBe(true);
  });

  it('points at the first vine left unguarded', () => {
    expect(checkVertexCover(path, [1])).toEqual({
      ok: false,
      error: { code: 'uncoveredEdge', edge: [2, 3] },
    });
  });

  it('a garden without vines needs no scarecrows', () => {
    expect(checkVertexCover(pathGraph(1), []).ok).toBe(true);
  });

  it('rejects unknown or repeated sprouts', () => {
    expect(checkVertexCover(path, [1, 7])).toMatchObject({
      ok: false,
      error: { code: 'vertexOutOfRange', index: 1, vertex: 7 },
    });
    expect(checkVertexCover(path, [1, 3, 1])).toMatchObject({
      ok: false,
      error: { code: 'repeatedVertex', index: 2, vertex: 1 },
    });
  });
});

describe('König cover from the final forest', () => {
  it('the moons of a failed search are the scarecrows (level 3.8)', () => {
    // Level 3.6/3.8: 1–2=3–4=5 with 1 in the dark, as 0–1=2–3=4.
    const lanterns = unwrap(
      createMatching(path, [
        [1, 2],
        [3, 4],
      ]),
    );
    const run = unwrap(bipartiteMatching(path, lanterns));
    expect(koenigCover(path, run.forest)).toEqual([1, 3]);
  });

  it('adds one side of the sprouts the search never reached', () => {
    // The same path plus a lit pair 5=6 that no tree can reach.
    const garden = unwrap(
      createGraph(7, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [5, 6],
      ]),
    );
    const lanterns = unwrap(
      createMatching(garden, [
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    );
    const run = unwrap(bipartiteMatching(garden, lanterns));
    expect(koenigCover(garden, run.forest)).toEqual([1, 3, 5]);
  });

  it('only applies to bees and flowers', () => {
    const run = unwrap(bipartiteMatching(cycleGraph(4)));
    expect(() => koenigCover(cycleGraph(5), run.forest)).toThrow();
  });

  it('property (König, C5): in bees and flowers there are as many scarecrows as lanterns', () => {
    fc.assert(
      fc.property(bipartiteWithMatchingArb(), ([graph, initial]) => {
        const run = unwrap(bipartiteMatching(graph, initial));
        const cover = koenigCover(graph, run.forest);
        expect(checkVertexCover(graph, cover).ok).toBe(true);
        expect(cover.length).toBe(size(run.matching));
      }),
    );
  });
});
