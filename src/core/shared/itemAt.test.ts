import { describe, expect, it } from 'vitest';
import { InvariantError } from './invariant';
import { itemAt } from './itemAt';

describe('itemAt', () => {
  it('reads the item at an index of a list', () => {
    expect(itemAt(['R', 'a', 'b'], 0)).toBe('R');
    expect(itemAt(['R', 'a', 'b'], 2)).toBe('b');
  });

  it('keeps items that are falsy but present', () => {
    expect(itemAt([0, -1], 0)).toBe(0);
    expect(itemAt([0, -1], 1)).toBe(-1);
  });

  it('fails loudly when an index falls outside the list, instead of yielding undefined', () => {
    expect(() => itemAt(['R'], 1)).toThrow(InvariantError);
    expect(() => itemAt(['R'], -1)).toThrow(InvariantError);
    expect(() => itemAt(['R'], 0.5)).toThrow(InvariantError);
    expect(() => itemAt([], 0)).toThrow('index 0 is outside a list of 0');
  });
});
