import { describe, expect, it } from 'vitest';
import { optionForKey } from './optionKeys';

describe('the digit that answers a question', () => {
  it('picks the option written as that number when every option is a number (a bet)', () => {
    const labels = ['0', '1', '2', '3'];
    expect(optionForKey('0', labels)).toBe(0);
    expect(optionForKey('3', labels)).toBe(3);
    expect(optionForKey('4', labels)).toBeNull();
    expect(optionForKey('2', ['2', '3', '4'])).toBe(0);
  });

  it('counts written answers from 1, in the order they are shown', () => {
    const labels = ['Sí', 'No', 'Depende'];
    expect(optionForKey('1', labels)).toBe(0);
    expect(optionForKey('3', labels)).toBe(2);
    expect(optionForKey('4', labels)).toBeNull();
    expect(optionForKey('0', labels)).toBeNull();
  });

  it('a key that is no digit, or no question, picks nothing', () => {
    expect(optionForKey('a', ['Sí', 'No'])).toBeNull();
    expect(optionForKey('Enter', ['1', '2'])).toBeNull();
    expect(optionForKey('1', [])).toBeNull();
  });
});
