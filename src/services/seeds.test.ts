import { describe, expect, it } from 'vitest';
import { emptySave, recordBetsWon } from './save';
import { seeds } from './seeds';

describe('the seeds of a player', () => {
  it('a new player has none', () => {
    expect(seeds(emptySave())).toBe(0);
  });

  it('one per bet won, however often it was won', () => {
    const save = recordBetsWon(recordBetsWon(emptySave(), ['1.6#3', '6.5#2']), ['1.6#3']);
    expect(seeds(save)).toBe(2);
  });
});
