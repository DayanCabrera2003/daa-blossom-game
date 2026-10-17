import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assetEntry } from '../src/game/assets/keys';
import { contrast } from '../src/game/picture/contrast';
import {
  BUTTON_STATES,
  WOOD_BUTTON,
  WOOD_DIALOGUE,
  WOOD_PANEL,
  type WoodPiece,
} from '../src/game/picture/wood';
import { PALETTE } from '../src/game/view/palette';
import { pngPixels } from '../tools/assets/pngColours';

// The wooden pieces of the interface (plan 06, section 1.6) and the text written on them: every
// label reads on its wood with the contrast WCAG asks of body text, measured on the very pixels of
// the pictures the game draws. The pack's plain button (an orange face) leaves no colour that
// reaches it, light or dark, so the game uses its lighter and its sunken faces instead.

/** WCAG 2's contrast for body text. */
const MIN_TEXT_CONTRAST = 4.5;

/** The pixels of the picture a piece is cut from, as the game serves it, read once each. */
const pictures = new Map<string, (x: number, y: number) => number | null>();
function pictureOf(piece: WoodPiece): (x: number, y: number) => number | null {
  const { path } = assetEntry(piece.texture);
  const read = pictures.get(path) ?? pngPixels(new Uint8Array(readFileSync(`public/${path}`)));
  pictures.set(path, read);
  return read;
}

/** The colour of the piece's face, where its text is written. */
function faceOf(piece: WoodPiece, at = piece.face): number {
  const colour = pictureOf(piece)(at.x, at.y);
  if (colour === null) throw new Error(`${piece.texture} is transparent at its face`);
  return colour;
}

const pieces: [string, WoodPiece][] = [
  ['the panel', WOOD_PANEL],
  ['the dialogue box', WOOD_DIALOGUE],
  ...BUTTON_STATES.map((state): [string, WoodPiece] => [`a button ${state}`, WOOD_BUTTON[state]]),
];

describe('text on wood', () => {
  it.each(pieces)('%s writes its text with contrast enough to read it', (_, piece) => {
    expect(contrast(PALETTE[piece.text], faceOf(piece))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('the name on the tab of the dialogue box reads too', () => {
    const { tab } = WOOD_DIALOGUE;
    expect(contrast(PALETTE[tab.text], faceOf(WOOD_DIALOGUE, tab.face))).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
  });

  it.each(pieces)('%s has its borders inside its picture, and a middle to stretch', (_, piece) => {
    const { width, height } = assetEntry(piece.texture).image ?? { width: 0, height: 0 };
    const { left, right, top, bottom } = piece.slices;
    expect(left + right).toBeLessThan(width);
    expect(top + bottom).toBeLessThan(height);
    // The face is in the middle, the part that stretches under the text.
    expect(piece.face.x).toBeGreaterThanOrEqual(left);
    expect(piece.face.x).toBeLessThan(width - right);
    expect(piece.face.y).toBeGreaterThanOrEqual(top);
    expect(piece.face.y).toBeLessThan(height - bottom);
  });

  it('the middle of each piece is one colour, so stretching it changes nothing', () => {
    for (const [, piece] of pieces) {
      const { width, height } = assetEntry(piece.texture).image ?? { width: 0, height: 0 };
      const { left, right, top, bottom } = piece.slices;
      const face = faceOf(piece);
      for (let y = top; y < height - bottom; y++) {
        for (let x = left; x < width - right; x++) expect(faceOf(piece, { x, y })).toBe(face);
      }
    }
  });

  it('a button in hand and one switched off look apart from one at rest', () => {
    const faces = BUTTON_STATES.map((state) => faceOf(WOOD_BUTTON[state]));
    expect(new Set(faces).size).toBe(BUTTON_STATES.length);
  });
});
