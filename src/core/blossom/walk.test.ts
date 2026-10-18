import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { isMatchedEdge } from '../matching/queries';
import { checkAlternatingPath } from '../matching/paths';
import { bipartiteSearch } from '../search/bipartiteSearch';
import { findOddCycle } from './detect';
import { walkToBase } from './walk';

describe('walking a flower to its base', () => {
  it('the base is already there', () => {
    expect(walkToBase(5, 0)).toEqual([0]);
  });

  it('a child lit with the next one goes forward around the loop (level 4.6, entering at c)', () => {
    expect(walkToBase(5, 1)).toEqual([1, 2, 3, 4, 0]);
    expect(walkToBase(5, 3)).toEqual([3, 4, 0]);
  });

  it('a child lit with the previous one goes backward', () => {
    expect(walkToBase(5, 2)).toEqual([2, 1, 0]);
    expect(walkToBase(5, 4)).toEqual([4, 3, 2, 1, 0]);
  });

  it('every walk is an even alternating path: an odd number of children', () => {
    for (let i = 0; i < 7; i++) expect(walkToBase(7, i).length % 2).toBe(1);
  });

  it('rejects an even loop or a child outside it', () => {
    expect(() => walkToBase(4, 1)).toThrow();
    expect(() => walkToBase(5, 5)).toThrow();
  });
  it('property (C7, Lemma 7.2): of the two ways round from a petal to the base, exactly one is even', () => {
    fc.assert(
      fc.property(graphWithMatchingArb(), ([graph, matching]) => {
        const result = bipartiteSearch(graph, matching);
        if (result.ok) return;
        const { forest, from, to } = result.error;
        const cycle = findOddCycle(forest, from, to);
        const at = (i: number): number => cycle[i] as number;
        for (let i = 1; i < cycle.length; i++) {
          // The walk, and the other way round: forwards to the end and back to 0, or backwards.
          const walk = walkToBase(cycle.length, i);
          const forwards = [...Array(cycle.length - i).keys()].map((k) => i + k).concat(0);
          const backwards = [...Array(i + 1).keys()].map((k) => i - k);
          const other = walk[1] === i + 1 ? backwards : forwards;
          for (const way of [walk, other]) {
            expect(checkAlternatingPath(graph, matching, way.map(at)).ok).toBe(true);
          }
          // The even way leaves the petal by its lantern; the odd way, by a dark vine.
          expect((walk.length - 1) % 2).toBe(0);
          expect((other.length - 1) % 2).toBe(1);
          expect(isMatchedEdge(matching, at(i), at(walk[1] as number))).toBe(true);
          expect(isMatchedEdge(matching, at(i), at(other[1] as number))).toBe(false);
        }
      }),
    );
  });
});
