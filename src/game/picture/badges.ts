/**
 * The mark badges, pixel by pixel (GDD §4.1: "insignias de 8 × 8 encima del brote. Sol amarillo
 * con rayos, luna azul en cuarto. Forma distinta además de color"): a sun is a round disc with
 * eight rays, a moon a crescent open to the right, and the split badge of 4.2 the left half of the
 * sun beside a crescent turned the other way. Each shape gets a one-pixel outline in the style of
 * the Ninja Adventure sprites. `#` is a pixel of the shape.
 */

/** Which badge: a sun, a moon, or the split one of a sprout that can be either. */
export type BadgeKind = 'sun' | 'moon' | 'split';

/** What a pixel of a badge is painted with: the sun's colour, the moon's, or the outline's. */
export type BadgeInk = 'sun' | 'moon' | 'outline';

/** One pixel of a badge, from the top-left corner of its box. */
export interface BadgePixel {
  readonly x: number;
  readonly y: number;
  readonly ink: BadgeInk;
}

// prettier-ignore
const SUN = [
  '...##...',
  '.#....#.',
  '...##...',
  '#.####.#',
  '#.####.#',
  '...##...',
  '.#....#.',
  '...##...',
];

// prettier-ignore
const MOON = [
  '..####..',
  '.###....',
  '###.....',
  '###.....',
  '###.....',
  '###.....',
  '.###....',
  '..####..',
];

/** The side of a badge's shape, and of its box with the outline round it. */
export const BADGE_SIZE = SUN.length;
export const BADGE_BOX = BADGE_SIZE + 2;

/** Whether the shape `rows` has a pixel at column `col` of row `row`. */
const at = (rows: readonly string[], col: number, row: number): boolean => rows[row]?.[col] === '#';

/** The ink of the shape's pixel at (col, row), or null where the shape has none. */
function shapeInk(kind: BadgeKind, col: number, row: number): BadgeInk | null {
  switch (kind) {
    case 'sun':
      return at(SUN, col, row) ? 'sun' : null;
    case 'moon':
      return at(MOON, col, row) ? 'moon' : null;
    case 'split':
      if (col < BADGE_SIZE / 2) return at(SUN, col, row) ? 'sun' : null;
      return at(MOON, BADGE_SIZE - 1 - col, row) ? 'moon' : null;
  }
}

/**
 * Every pixel of a badge in its box: the shape one pixel in from the corner, and the outline on
 * every pixel round it that touches the shape by a side.
 */
export function badgePixels(kind: BadgeKind): BadgePixel[] {
  const ink = (x: number, y: number): BadgeInk | null => shapeInk(kind, x - 1, y - 1);
  const pixels: BadgePixel[] = [];
  for (let y = 0; y < BADGE_BOX; y++) {
    for (let x = 0; x < BADGE_BOX; x++) {
      const own = ink(x, y);
      if (own !== null) pixels.push({ x, y, ink: own });
      else if ([ink(x - 1, y), ink(x + 1, y), ink(x, y - 1), ink(x, y + 1)].some((i) => i !== null))
        pixels.push({ x, y, ink: 'outline' });
    }
  }
  return pixels;
}
