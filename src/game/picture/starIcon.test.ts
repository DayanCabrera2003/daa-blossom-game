import { describe, expect, it } from 'vitest';
import { PIXEL_FONT } from './pixelFont';
import { STAR_PIXELS, STAR_SIZE, STAR_STEP, labelStars, starRow } from './starIcon';

describe('the drawn star (the pixel font has no ★)', () => {
  it('is a symmetric shape as tall as a capital letter, inside its square', () => {
    expect(STAR_SIZE).toBe(PIXEL_FONT.capHeight);
    expect(STAR_PIXELS.length).toBeGreaterThan(0);
    for (const { x, y } of STAR_PIXELS) {
      expect(x >= 0 && x < STAR_SIZE && y >= 0 && y < STAR_SIZE).toBe(true);
      // The mirror image of every pixel is a pixel too.
      expect(STAR_PIXELS).toContainEqual({ x: STAR_SIZE - 1 - x, y });
    }
    // The tip on top and both feet at the bottom.
    expect(STAR_PIXELS).toContainEqual({ x: 3, y: 0 });
    expect(STAR_PIXELS.filter(({ y }) => y === STAR_SIZE - 1)).toHaveLength(2);
  });

  it('lays a row of stars out one step apart, the earned ones first', () => {
    expect(starRow(2, 3)).toEqual([
      { x: 0, earned: true },
      { x: STAR_STEP, earned: true },
      { x: 2 * STAR_STEP, earned: false },
    ]);
    expect(starRow(0, 0)).toEqual([]);
  });

  it('reserves whole character cells in a label for its stars, centred in them', () => {
    expect(labelStars(0)).toEqual({ spaces: 0, offsets: [] });
    // One star (7 px) fits in two cells of 6 px, with 2 px on each side.
    expect(labelStars(1)).toEqual({ spaces: 2, offsets: [2] });
    // Three stars need 23 px: four cells (24 px) hold them.
    const three = labelStars(3);
    expect(three.spaces).toBe(4);
    const last = three.offsets.at(-1) ?? 0;
    expect(three.offsets[0]).toBeGreaterThanOrEqual(0);
    expect(last + STAR_SIZE).toBeLessThanOrEqual(three.spaces * PIXEL_FONT.advance);
  });
});
