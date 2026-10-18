import { describe, expect, it } from 'vitest';
import { assetEntry } from '../assets/keys';
import { bookSounds } from './bookSounds';

describe('sounds the books ask for', () => {
  it('opens, closes and clicks with the sounds of the notebook and the buttons', () => {
    const soundOf = bookSounds();
    expect(soundOf('bookOpen')).toBe('sfx.bookOpen');
    expect(soundOf('bookClose')).toBe('sfx.bookClose');
    expect(soundOf('click')).toBe('sfx.button');
  });

  it('takes the page turns in turn, so two turns in a row do not sound alike', () => {
    const soundOf = bookSounds();
    const turns = Array.from({ length: 4 }, () => soundOf('bookFlip'));
    expect(turns).toEqual(['sfx.bookFlip1', 'sfx.bookFlip2', 'sfx.bookFlip3', 'sfx.bookFlip1']);
  });

  it('every sound is an effect of the manifest', () => {
    const soundOf = bookSounds();
    for (const sound of ['bookOpen', 'bookFlip', 'bookClose', 'click'] as const) {
      expect(assetEntry(soundOf(sound)).kind).toBe('sfx');
    }
  });
});
