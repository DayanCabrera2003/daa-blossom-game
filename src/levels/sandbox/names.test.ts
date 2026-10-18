import { describe, expect, it } from 'vitest';
import { LETTERS, nextName } from './names';

describe('the next free name of a sprout', () => {
  it('names the sprouts A, B, C… in order', () => {
    expect(nextName([])).toBe('A');
    expect(nextName(['A'])).toBe('B');
    expect(nextName(['A', 'B', 'C'])).toBe('D');
  });

  it('takes the first letter left free, even after a gap', () => {
    expect(nextName(['A', 'C'])).toBe('B');
    expect(nextName(['B'])).toBe('A');
  });

  it('ignores names that are not single capitals, such as those of an imported level', () => {
    expect(nextName(['R', 'a', 'a1', 'A'])).toBe('B');
  });

  it('has the 26 letters of the alphabet, without Ñ nor double letters', () => {
    expect(LETTERS).toHaveLength(26);
    expect(LETTERS.join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });

  it('has no name left once every letter is taken', () => {
    expect(nextName(LETTERS)).toBeNull();
  });
});
