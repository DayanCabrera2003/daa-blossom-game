import { describe, expect, it } from 'vitest';
import { withSprout, withoutSprout } from './sproutSet';

describe('sets of sprouts (scarecrows, stones)', () => {
  it('adds a sprout keeping the set sorted', () => {
    expect(withSprout([1, 4], 2)).toEqual({ ok: true, value: [1, 2, 4] });
  });

  it('a sprout holds one at most', () => {
    expect(withSprout([1, 4], 4)).toEqual({
      ok: false,
      error: { code: 'alreadyPlaced', vertex: 4 },
    });
  });

  it('removes a sprout that is there', () => {
    expect(withoutSprout([1, 2, 4], 2)).toEqual({ ok: true, value: [1, 4] });
    expect(withoutSprout([1, 4], 2)).toEqual({
      ok: false,
      error: { code: 'notPlaced', vertex: 2 },
    });
  });
});
