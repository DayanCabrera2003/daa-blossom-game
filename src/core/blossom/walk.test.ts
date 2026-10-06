import { describe, expect, it } from 'vitest';
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
});
