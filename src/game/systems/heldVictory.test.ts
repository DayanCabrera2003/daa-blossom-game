import { describe, expect, it } from 'vitest';
import { holdVictory, NO_VICTORY_HELD, releaseVictory } from './heldVictory';
import type { StarResult } from './stars';

const stars = { total: 2 } as unknown as StarResult;

describe('the victory panel waits for the last move to finish playing', () => {
  it('shows at once when nothing is playing', () => {
    expect(holdVictory(stars, false)).toEqual({ held: NO_VICTORY_HELD, show: stars });
  });

  it('is held while the lighting still plays', () => {
    expect(holdVictory(stars, true)).toEqual({ held: stars, show: null });
  });

  it('stays held frame after frame while it plays', () => {
    expect(releaseVictory(stars, true)).toEqual({ held: stars, show: null });
  });

  it('shows the frame the lighting ends, and only once', () => {
    const released = releaseVictory(stars, false);
    expect(released).toEqual({ held: NO_VICTORY_HELD, show: stars });
    expect(releaseVictory(released.held, false)).toEqual({ held: NO_VICTORY_HELD, show: null });
  });
});
