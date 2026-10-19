import { describe, expect, it } from 'vitest';
import { claimText } from './claimText';

describe('the words of a claim that falls short', () => {
  it('each verdict has its own text, by its code', () => {
    expect(claimText({ code: 'chainLeft' })).toEqual({ key: 'claim.chainLeft', params: {} });
    expect(claimText({ code: 'searchOpen' })).toEqual({ key: 'claim.searchOpen', params: {} });
    expect(claimText({ code: 'searchNotOver' })).toEqual({
      key: 'claim.searchNotOver',
      params: {},
    });
    expect(claimText({ code: 'notTheMoons' })).toEqual({ key: 'claim.notTheMoons', params: {} });
  });

  it('the vine nobody guards glows in the garden; the text never names it', () => {
    expect(claimText({ code: 'unguarded', vine: [5, 6] })).toEqual({
      key: 'claim.unguarded',
      params: {},
    });
  });

  it('the counts fill the gaps of their texts', () => {
    expect(claimText({ code: 'countMismatch', scarecrows: 3, lanterns: 2 })).toEqual({
      key: 'claim.countMismatch',
      params: { scarecrows: 3, lanterns: 2 },
    });
    expect(claimText({ code: 'countShort', atLeast: 0, dark: 2 })).toEqual({
      key: 'claim.countShort',
      params: { atLeast: 0, dark: 2 },
    });
  });
});
