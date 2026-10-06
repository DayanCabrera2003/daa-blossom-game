import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { checkBlossom } from './isBlossom';

// Level 4.6: R–a=b, cycle b–c=d–f=g–b, exit c–e. R a b c d f g e = 0 1 2 3 4 5 6 7.
const petals = unwrap(
  createGraph(8, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 2],
    [3, 7],
  ]),
);
const petalLanterns = unwrap(
  createMatching(petals, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

// Level 4.3: an even loop b–c=d–e–b hanging from R–a=b, with e=f outside.
// R a b c d e f = 0 1 2 3 4 5 6.
const evenLoop = unwrap(
  createGraph(7, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 2],
    [5, 6],
  ]),
);
const evenLanterns = unwrap(
  createMatching(evenLoop, [
    [1, 2],
    [3, 4],
    [5, 6],
  ]),
);

describe('blossom check', () => {
  it('accepts the five petals of level 4.6 and puts the base first', () => {
    expect(checkBlossom(petals, petalLanterns, [2, 3, 4, 5, 6])).toEqual({
      ok: true,
      value: [2, 3, 4, 5, 6],
    });
  });

  it('finds the base wherever the cycle starts, keeping its direction', () => {
    expect(unwrap(checkBlossom(petals, petalLanterns, [4, 5, 6, 2, 3]))).toEqual([2, 3, 4, 5, 6]);
    expect(unwrap(checkBlossom(petals, petalLanterns, [5, 4, 3, 2, 6]))).toEqual([2, 6, 5, 4, 3]);
  });

  it('a base in the dark is fine: the flower is then a root of the search', () => {
    // The triangle b–c=d–b alone, with b exposed: 0–1=2–0.
    const triangle = unwrap(
      createGraph(3, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
    );
    const lantern = unwrap(createMatching(triangle, [[1, 2]]));
    expect(unwrap(checkBlossom(triangle, lantern, [1, 2, 0]))).toEqual([0, 1, 2]);
  });

  it('even loops are not flowers (level 4.3)', () => {
    expect(checkBlossom(evenLoop, evenLanterns, [2, 3, 4, 5])).toEqual({
      ok: false,
      error: { code: 'evenLength', length: 4 },
    });
  });

  it('needs at least three sprouts', () => {
    expect(checkBlossom(petals, petalLanterns, [2])).toMatchObject({
      ok: false,
      error: { code: 'tooShort' },
    });
  });

  it('rejects unknown or repeated sprouts', () => {
    expect(checkBlossom(petals, petalLanterns, [2, 3, 9])).toMatchObject({
      ok: false,
      error: { code: 'vertexOutOfRange', index: 2, vertex: 9 },
    });
    expect(checkBlossom(petals, petalLanterns, [2, 3, 2])).toMatchObject({
      ok: false,
      error: { code: 'repeatedVertex', index: 2, vertex: 2 },
    });
  });

  it('points at the missing vine, including the one closing the loop', () => {
    expect(checkBlossom(petals, petalLanterns, [2, 4, 3])).toMatchObject({
      ok: false,
      error: { code: 'notAdjacent', index: 0 },
    });
    expect(checkBlossom(petals, petalLanterns, [1, 2, 3])).toMatchObject({
      ok: false,
      error: { code: 'notAdjacent', index: 2 },
    });
  });

  it('a loop with a lantern too few has two dark meeting points and is rejected', () => {
    // The five petals with the f=g lantern put out.
    const fewer = unwrap(
      createMatching(petals, [
        [1, 2],
        [3, 4],
      ]),
    );
    expect(checkBlossom(petals, fewer, [2, 3, 4, 5, 6])).toMatchObject({
      ok: false,
      error: { code: 'notAlternating', index: 3 },
    });
  });
});
