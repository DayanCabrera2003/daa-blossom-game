import { describe, expect, it } from 'vitest';
import { PALETTE } from '../view/palette';
import { contrast } from './contrast';
import { HUB_FLOWER } from './hubGarden';
import { STAR_PIXELS, STAR_SIZE } from './starIcon';
import { WON_FLOWER_SIZE, WON_FLOWER_TONES, wonFlowerPixels } from './wonFlower';

const at = (pixels: ReturnType<typeof wonFlowerPixels>) =>
  new Map(pixels.map((pixel) => [`${pixel.x},${pixel.y}`, pixel.tone]));

describe('the golden flower of a won secret flower', () => {
  const pixels = wonFlowerPixels();
  const tones = at(pixels);

  it('is a square of its own, larger than the open flower, inside the column of 16 pixels', () => {
    expect(WON_FLOWER_SIZE).toBeGreaterThan(12);
    expect(WON_FLOWER_SIZE).toBeLessThanOrEqual(HUB_FLOWER.width);
    for (const { x, y } of pixels) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(WON_FLOWER_SIZE);
      expect(y).toBeLessThan(WON_FLOWER_SIZE);
    }
    expect(tones.size).toBe(pixels.length);
  });

  it('has golden petals wrapped in a dark outline a pixel wide', () => {
    for (const { x, y, tone } of pixels) {
      if (tone !== 'petal') continue;
      // Every pixel next to a petal is part of the flower: no petal touches the grass.
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const)
        expect(tones.has(`${x + dx},${y + dy}`), `${x},${y}`).toBe(true);
    }
    for (const { x, y, tone } of pixels) {
      if (tone !== 'outline') continue;
      const touches = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx = 0, dy = 0]) => tones.get(`${x + dx},${y + dy}`) === 'petal');
      expect(touches, `${x},${y}`).toBe(true);
    }
  });

  it('wears the star of the score in the middle of its petals', () => {
    const offset = (WON_FLOWER_SIZE - STAR_SIZE) / 2;
    for (const pixel of STAR_PIXELS)
      expect(tones.get(`${pixel.x + offset},${pixel.y + offset}`)).toBe('star');
    expect(pixels.filter((pixel) => pixel.tone === 'star')).toHaveLength(STAR_PIXELS.length);
  });

  it('is symmetric left to right, as the star is', () => {
    for (const { x, y, tone } of pixels)
      expect(tones.get(`${WON_FLOWER_SIZE - 1 - x},${y}`)).toBe(tone);
  });

  it('reads its star and its outline against the gold of its petals', () => {
    const petal = PALETTE[WON_FLOWER_TONES.petal];
    expect(contrast(petal, PALETTE[WON_FLOWER_TONES.star])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(petal, PALETTE[WON_FLOWER_TONES.outline])).toBeGreaterThanOrEqual(4.5);
  });
});
