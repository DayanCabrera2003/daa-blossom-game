/**
 * The pixel font of the game, monogram extended (CC0; plan 06, section 1.2), and its measures at
 * its native size. Measured from the TTF: an em of 1024 units with every outline on a grid of 64,
 * so one font pixel is one logical pixel at 16 px; every glyph is 384 units (6 pixels) wide and a
 * capital is 7 pixels high. Drawn at a whole multiple of the native size, each font pixel covers
 * whole logical pixels and the letters stay sharp; at any other size they fall between pixels.
 */
export const PIXEL_FONT = {
  /** The CSS family the page's `@font-face` declares. */
  family: 'monogram',
  /** The size in logical pixels at which one font pixel is one logical pixel. */
  nativeSize: 16,
  /** The width of every character cell at the native size (the font is monospaced). */
  advance: 6,
  /** The height of a capital letter at the native size. */
  capHeight: 7,
  /** From the top of a line to the baseline: a capital and the accent over it (Á, Ñ). */
  ascent: 10,
  /** From the baseline to the bottom of a line: the tails of g, j, p, q, y. */
  descent: 2,
} as const;

/**
 * The size the views ask for body text (GDD §4.1: 8, "with double scale for long text"). Each
 * whole multiple of it is one more multiple of the native size: the 8 to 12 of the greybox's body
 * text and titles are drawn at the native size, a request of 16 at twice it.
 */
const BODY_REQUEST = 8;

/** How many times the native size a text asked for at `requested` is drawn: one at least. */
const scale = (requested: number): number => Math.max(1, Math.floor(requested / BODY_REQUEST));

/** The font size, in logical pixels, to draw a text the views ask for at `requested`. */
export function fontSize(requested: number): number {
  return PIXEL_FONT.nativeSize * scale(requested);
}

/**
 * The line measures of a text asked for at `requested`, as Phaser takes them (`fontSize` is the
 * height of a line). Given rather than measured, so every line is the same height whether or not
 * the page has loaded the font yet, and layouts can count on it.
 */
export function fontMetrics(requested: number): {
  ascent: number;
  descent: number;
  fontSize: number;
} {
  const times = scale(requested);
  const ascent = PIXEL_FONT.ascent * times;
  const descent = PIXEL_FONT.descent * times;
  return { ascent, descent, fontSize: ascent + descent };
}
