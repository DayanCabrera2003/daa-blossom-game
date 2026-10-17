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
} as const;

/**
 * The size the views asked for in the greybox, where 8 was body text (GDD §4.1), that fills one
 * native size. Larger requests get whole multiples of it: titles and long text, twice.
 */
const BODY_REQUEST = 8;

/**
 * The font size, in logical pixels, to draw a text the views ask for at `requested`: the whole
 * multiple of the native size nearest to it, and never less than one.
 */
export function fontSize(requested: number): number {
  return PIXEL_FONT.nativeSize * Math.max(1, Math.round(requested / BODY_REQUEST));
}
