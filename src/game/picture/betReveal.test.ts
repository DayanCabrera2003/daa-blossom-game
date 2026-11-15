import { describe, expect, it } from 'vitest';
import { betReveal } from './betReveal';

describe('what the mentor says when a formal bet is revealed', () => {
  it('a right bet is told right, in the singular when one lantern fits', () => {
    expect(betReveal(3, 3)).toEqual({ key: 'bet.revealRight', params: { bet: 3, count: 3 } });
    expect(betReveal(1, 1)).toEqual({ key: 'bet.revealRight.one', params: { bet: 1, count: 1 } });
  });

  it('a wrong bet is told with the bet beside the count, in the singular when one fits', () => {
    expect(betReveal(2, 3)).toEqual({ key: 'bet.revealWrong', params: { bet: 2, count: 3 } });
    expect(betReveal(2, 1)).toEqual({ key: 'bet.revealWrong.one', params: { bet: 2, count: 1 } });
  });
});
