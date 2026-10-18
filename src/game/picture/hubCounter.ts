import { itemAt } from '@core/shared/itemAt';
import { PIXEL_FONT } from './pixelFont';
import { labelStars } from './starIcon';

/**
 * The counter by the hub's title (plan 08, section 1.2): the stars of the whole game after a drawn
 * star, then the seeds after the seed icon of the pack, "★ 57  🌱 3". The pixel font has neither,
 * so, like a level's button (`labelStars`), the text leaves blank cells where each is drawn. Pure:
 * the scene writes the text and draws the star and the icon where this says.
 */
export interface HubCounter {
  /** What to write: blanks for the star, the stars, a blank, blanks for the seed, the seeds. */
  readonly text: string;
  /** Where the star starts, from the left edge of the text. */
  readonly star: number;
  /** Where the seed icon starts, from the left edge of the text. */
  readonly seed: number;
  /** The width of the text, one cell of the monospaced font per character. */
  readonly width: number;
}

/** The counter for `stars` and `seeds`, with a seed icon `seedWidth` pixels wide. */
export function hubCounter(stars: number, seeds: number, seedWidth: number): HubCounter {
  const cell = PIXEL_FONT.advance;
  const starRoom = labelStars(1);
  // The seed is centred in as many cells as it needs, like the star.
  const seedCells = Math.ceil(seedWidth / cell);
  const seedPad = Math.floor((seedCells * cell - seedWidth) / 2);
  const before = `${' '.repeat(starRoom.spaces)}${stars} `;
  const text = `${before}${' '.repeat(seedCells)}${seeds}`;
  return {
    text,
    star: itemAt(starRoom.offsets, 0),
    seed: [...before].length * cell + seedPad,
    width: [...text].length * cell,
  };
}
