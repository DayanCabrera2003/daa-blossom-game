import { PIXEL_FONT } from './pixelFont';

/**
 * A seal written inside a hub sign, after its word (the Códex's "nuevo" while some open page is
 * still unread): the sign's label is followed by blank cells of the pixel font, and the seal is
 * drawn in them, so it reads as part of that sign and of no other. Pure: the scene measures nothing
 * the font does not already say.
 */

/** Clear space on each side of the seal's word, inside its lit patch. */
export const SEAL_PAD = 2;

/** The width of a seal: its letters, one cell of the monospaced font each, and its padding. */
export const sealWidth = (word: string): number =>
  [...word].length * PIXEL_FONT.advance + 2 * SEAL_PAD;

/**
 * Room for the seal `word` at the end of a sign's label: how many spaces to write after the label
 * (one cell of air, then the cells the seal covers), and where the seal starts from the left edge
 * of those spaces, centred in its own cells.
 */
export function labelSeal(word: string): { spaces: number; offset: number } {
  const cells = Math.ceil(sealWidth(word) / PIXEL_FONT.advance);
  const pad = Math.floor((cells * PIXEL_FONT.advance - sealWidth(word)) / 2);
  return { spaces: 1 + cells, offset: PIXEL_FONT.advance + pad };
}
