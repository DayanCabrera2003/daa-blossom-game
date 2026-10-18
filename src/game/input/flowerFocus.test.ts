import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { flowerKey } from './flowerFocus';

describe('the shortcut to the secret flowers of the hub', () => {
  it('F goes to the first flower, then to each next one, and back to the first', () => {
    expect(flowerKey('next', null, 3)).toEqual({ focus: 0 });
    expect(flowerKey('next', 0, 3)).toEqual({ focus: 1 });
    expect(flowerKey('next', 2, 3)).toEqual({ focus: 0 });
  });

  it('Shift+F goes the other way, from the last flower', () => {
    expect(flowerKey('previous', null, 3)).toEqual({ focus: 2 });
    expect(flowerKey('previous', 0, 3)).toEqual({ focus: 2 });
    expect(flowerKey('previous', 2, 3)).toEqual({ focus: 1 });
  });

  it('with no flower on the hub nothing takes the focus', () => {
    for (const key of ['next', 'previous'] as const) {
      expect(flowerKey(key, null, 0)).toEqual({ focus: null });
    }
  });

  it('the focus always lands on a flower there is', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('next', 'previous'),
        fc
          .integer({ min: 1, max: 8 })
          .chain((count) => fc.tuple(fc.constant(count), fc.option(fc.nat(count - 1)))),
        (key, [count, focus]) => {
          const after = flowerKey(key, focus, count);
          expect(after.focus).not.toBeNull();
          expect(after.focus).toBeGreaterThanOrEqual(0);
          expect(after.focus).toBeLessThan(count);
        },
      ),
    );
  });
});
