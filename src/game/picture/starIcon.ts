import { PIXEL_FONT } from './pixelFont';

/**
 * The star of a level's score, drawn pixel by pixel: the pixel font has no `★` (plan 06, section
 * 1.2). As tall as a capital letter, so it sits on a line of text; `#` is a pixel of the star.
 */
// prettier-ignore
const SHAPE = [
  '...#...',
  '...#...',
  '..###..',
  '#######',
  '.#####.',
  '..#.#..',
  '.#...#.',
];

/** The side of the star's square, in logical pixels. */
export const STAR_SIZE = SHAPE.length;

/** From one star to the next in a row: the star and a pixel of air. */
export const STAR_STEP = STAR_SIZE + 1;

/** A pixel of the star, from its top-left corner. */
export interface Pixel {
  readonly x: number;
  readonly y: number;
}

/** Every pixel of the star, row by row. */
export const STAR_PIXELS: readonly Pixel[] = SHAPE.flatMap((row, y) =>
  [...row].flatMap((cell, x) => (cell === '#' ? [{ x, y }] : [])),
);

/** One star of a row: where it starts, and whether it has been earned (or is still to win). */
export interface RowStar {
  readonly x: number;
  readonly earned: boolean;
}

/** A row of `total` stars, the `earned` ones first, from the row's left edge. */
export function starRow(earned: number, total: number): RowStar[] {
  return Array.from({ length: total }, (_, i) => ({ x: i * STAR_STEP, earned: i < earned }));
}

/** The width of `count` stars side by side, without the air after the last one. */
export const rowWidth = (count: number): number => (count === 0 ? 0 : count * STAR_STEP - 1);

/**
 * Room for `count` stars at the end of a text label (a level's button in the hub): how many spaces
 * of the pixel font to write after the label, and where each star starts, from the left edge of
 * those spaces, so the row is centred in them.
 */
export function labelStars(count: number): { spaces: number; offsets: number[] } {
  const spaces = Math.ceil(rowWidth(count) / PIXEL_FONT.advance);
  const pad = Math.floor((spaces * PIXEL_FONT.advance - rowWidth(count)) / 2);
  return { spaces, offsets: starRow(count, count).map(({ x }) => pad + x) };
}
