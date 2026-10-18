import { describe, expect, it } from 'vitest';
import { PIXEL_FONT } from './pixelFont';
import { SEAL_PAD, labelSeal, sealWidth } from './signSeal';

describe('the seal written inside a sign, after its word', () => {
  it('is as wide as its letters and its padding on both sides', () => {
    expect(sealWidth('nuevo')).toBe(5 * PIXEL_FONT.advance + 2 * SEAL_PAD);
    // Letters with accents are one cell each, like any other.
    expect(sealWidth('más')).toBe(3 * PIXEL_FONT.advance + 2 * SEAL_PAD);
  });

  it('leaves room for the whole seal after one cell of air, inside the label', () => {
    for (const word of ['nuevo', 'más', 'x']) {
      const { spaces, offset } = labelSeal(word);
      // One space parts the seal from the word, so it never touches its last letter.
      expect(offset).toBeGreaterThanOrEqual(PIXEL_FONT.advance);
      // The seal ends inside the blank cells.
      expect(offset + sealWidth(word)).toBeLessThanOrEqual(spaces * PIXEL_FONT.advance);
      // No more cells than it needs: one of air and those the seal covers.
      expect(spaces).toBe(1 + Math.ceil(sealWidth(word) / PIXEL_FONT.advance));
    }
  });
});
