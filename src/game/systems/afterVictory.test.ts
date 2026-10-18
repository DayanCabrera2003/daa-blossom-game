import { describe, expect, it } from 'vitest';
import { afterVictory } from './afterVictory';

/** The levels the player can see, in order. */
const SHOWN = ['7.3', '7.4', '7.5'].map((id) => ({ id }));

describe('where a victory leads', () => {
  it('to the next garden the player can see, or back to the hub', () => {
    expect(afterVictory('7.3', SHOWN)).toEqual({ next: '7.4', back: 'hub' });
  });

  it('the last garden leads to the epilogue instead of the hub, with no next garden', () => {
    expect(afterVictory('7.5', SHOWN)).toEqual({ next: null, back: 'epilogue' });
  });

  it('the last garden shown that is not the end of the game only leads back to the hub', () => {
    expect(afterVictory('7.4', SHOWN.slice(0, 2))).toEqual({ next: null, back: 'hub' });
  });

  it('a level not shown (a draft outside teacher mode) has no next garden', () => {
    expect(afterVictory('9.1', SHOWN)).toEqual({ next: null, back: 'hub' });
  });
});
