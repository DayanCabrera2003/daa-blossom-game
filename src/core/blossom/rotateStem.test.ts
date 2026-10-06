import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { isExposed, size } from '../matching/queries';
import { unwrap } from '../shared/result';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { pathToRoot } from '../search/pathToRoot';
import { findOddCycle } from './detect';
import { checkBlossom } from './isBlossom';
import { rotateStem } from './rotateStem';

// Level 4.10: R–a=b, triangle b–c=d–b, exit c–e. R a b c d e = 0 1 2 3 4 5.
const festival = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const lanterns = unwrap(
  createMatching(festival, [
    [1, 2],
    [3, 4],
  ]),
);

describe('rotating the stem', () => {
  it('R–a=b becomes R=a–b: same lanterns, and the base b is now in the dark (level 4.10)', () => {
    const rotated = unwrap(rotateStem(festival, lanterns, [0, 1, 2]));
    expect(rotated.mate).toEqual([1, 0, -1, 4, 3, -1]);
    expect(size(rotated)).toBe(size(lanterns));
    // From the dark base the chain b–d=c–e is direct, no flower needed.
    expect(checkAugmentingPath(festival, rotated, [2, 4, 3, 5]).ok).toBe(true);
  });

  it('a stem of length zero leaves everything as it was', () => {
    expect(unwrap(rotateStem(festival, lanterns, [0]))).toEqual(lanterns);
  });

  it('refuses a path that is not a stem, saying why', () => {
    expect(rotateStem(festival, lanterns, [0, 1])).toMatchObject({
      ok: false,
      error: { code: 'wrongParity' },
    });
    expect(rotateStem(festival, lanterns, [1, 2, 3])).toMatchObject({
      ok: false,
      error: { code: 'endpointNotExposed' },
    });
  });

  it('property: rotating the stem of a found flower darkens its base and keeps it a flower', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const result = bipartiteSearch(graph, matching);
        if (result.ok) return;
        const { forest, from, to } = result.error;
        const loop = findOddCycle(forest, from, to);
        const base = loop[0] as number;
        const rotated = unwrap(rotateStem(graph, matching, pathToRoot(forest, base).reverse()));
        expect(size(rotated)).toBe(size(matching));
        expect(isExposed(rotated, base)).toBe(true);
        expect(checkBlossom(graph, rotated, loop)).toEqual({ ok: true, value: loop });
      }),
    );
  });
});
