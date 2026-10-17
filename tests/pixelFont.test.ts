import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetEntry } from '../src/game/assets/keys';
import { PIXEL_FONT } from '../src/game/picture/pixelFont';

// The measures written in picture/pixelFont.ts are those of the committed TTF: at the native size
// one em is a whole number of font pixels and every character cell a whole number of pixels.

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));
const bytes = readFileSync(join(PUBLIC, assetEntry('font.monogram').path));

/** Where a table of the font starts, from its table directory. */
function table(tag: string): number {
  for (let i = 0; i < bytes.readUInt16BE(4); i++) {
    const record = 12 + 16 * i;
    if (bytes.toString('latin1', record, record + 4) === tag) return bytes.readUInt32BE(record + 8);
  }
  throw new Error(`no ${tag} table`);
}

/** The units of one font pixel: the outlines of monogram lie on a grid of 64 units. */
const PIXEL_UNITS = 64;

describe('the measures of the pixel font', () => {
  it('has as many font pixels per em as its native size', () => {
    const unitsPerEm = bytes.readUInt16BE(table('head') + 18);
    expect(unitsPerEm / PIXEL_UNITS).toBe(PIXEL_FONT.nativeSize);
  });

  it('has character cells as wide as its advance, the same for every glyph', () => {
    const metrics = bytes.readUInt16BE(table('hhea') + 34);
    const hmtx = table('hmtx');
    const advances = new Set(
      Array.from({ length: metrics }, (_, i) => bytes.readUInt16BE(hmtx + 4 * i)),
    );
    // Glyph 0 (the missing glyph) may be empty; every drawn one shares the same cell.
    advances.delete(0);
    expect([...advances].map((units) => units / PIXEL_UNITS)).toEqual([PIXEL_FONT.advance]);
  });
});
