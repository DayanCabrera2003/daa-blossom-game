import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TOAST_LONGEST_MS, TOAST_SHORTEST_MS, toastDuration } from './toastDuration';

describe('how long a toast stays', () => {
  it('a short message stays as long as every toast used to, 2.6 s', () => {
    expect(TOAST_SHORTEST_MS).toBe(2600);
    expect(toastDuration('')).toBe(2600);
    expect(toastDuration('Ya tiene farol.')).toBe(2600);
  });

  it('a message of 130 characters stays long enough to be read, about 10 s', () => {
    expect(toastDuration('a'.repeat(130))).toBeGreaterThanOrEqual(9000);
  });

  it('grows with the length, at a reading pace, between its floor and its cap', () => {
    expect(toastDuration('a'.repeat(56))).toBe(1000 + 4000);
    expect(toastDuration('a'.repeat(1000))).toBe(TOAST_LONGEST_MS);
    fc.assert(
      fc.property(fc.string(), fc.string(), (text, more) => {
        const shorter = toastDuration(text);
        expect(toastDuration(text + more)).toBeGreaterThanOrEqual(shorter);
        expect(shorter).toBeGreaterThanOrEqual(TOAST_SHORTEST_MS);
        expect(shorter).toBeLessThanOrEqual(TOAST_LONGEST_MS);
      }),
    );
  });

  it('counts letters, not code units: an accent or a symbol is one letter', () => {
    expect(toastDuration('é'.repeat(56))).toBe(toastDuration('e'.repeat(56)));
    expect(toastDuration('🌸'.repeat(56))).toBe(toastDuration('e'.repeat(56)));
  });
});
