import type { PALETTE } from '../view/palette';
import { STAR_PIXELS, STAR_SIZE } from './starIcon';

/**
 * The flower of a won secret flower in the hub (plan 09, phase 2): a golden rosette of eight
 * petals as large as the flower's column allows, wrapped in a dark outline a pixel wide so it
 * reads on the grass, with the star of the score in dark in its middle. It replaces the pack's
 * open flower tinted gold, too small and too pale to tell a won flower from an open one. Drawn
 * pixel by pixel, like the star (`starIcon.ts`): `o` is a petal, `k` its outline; the star is laid
 * over the middle.
 */
// prettier-ignore
const SHAPE = [
  '....kkk.kkk....',
  '...koookoook...',
  '...koooooook...',
  '.kkkoooooookkk.',
  'koooooooooooook',
  'koooooooooooook',
  'koooooooooooook',
  '.koooooooooook.',
  'koooooooooooook',
  'koooooooooooook',
  'koooooooooooook',
  '.kkkoooooookkk.',
  '...koooooook...',
  '...koookoook...',
  '....kkk.kkk....',
];

/** The side of the flower's square, in logical pixels. */
export const WON_FLOWER_SIZE = SHAPE.length;

/** What a pixel of the flower is: a petal, the outline round them, or the star in the middle. */
export type WonFlowerTone = 'petal' | 'outline' | 'star';

/** The colour of `view/palette.ts` each part is painted in: gold petals, a dark outline and star. */
export const WON_FLOWER_TONES: Readonly<Record<WonFlowerTone, keyof typeof PALETTE>> = {
  petal: 'sun',
  outline: 'ink',
  star: 'ink',
};

/** A pixel of the flower, from its top-left corner, and what it is. */
export interface WonFlowerPixel {
  readonly x: number;
  readonly y: number;
  readonly tone: WonFlowerTone;
}

/** Every pixel of the flower, row by row; the star's pixels are its own, not petals. */
export function wonFlowerPixels(): WonFlowerPixel[] {
  const offset = (WON_FLOWER_SIZE - STAR_SIZE) / 2;
  const star = new Set(STAR_PIXELS.map(({ x, y }) => `${x + offset},${y + offset}`));
  return SHAPE.flatMap((row, y) =>
    [...row].flatMap((cell, x): WonFlowerPixel[] => {
      if (cell === 'k') return [{ x, y, tone: 'outline' }];
      if (cell !== 'o') return [];
      return [{ x, y, tone: star.has(`${x},${y}`) ? 'star' : 'petal' }];
    }),
  );
}
