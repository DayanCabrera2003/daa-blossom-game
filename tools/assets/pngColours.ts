// The distinct opaque colours of a small PNG, so a test can prove that the palette written in
// code is exactly the one of the pack's `Palette.png`. Only what that sheet needs is decoded:
// 8-bit RGB or RGBA, not interlaced; anything else is refused rather than misread.
import { inflateSync } from 'node:zlib';
import { pngSize } from './pngSize';

/** Colour types of the IHDR chunk that this decoder reads, with their channels per pixel. */
const CHANNELS: Readonly<Record<number, number>> = { 2: 3, 6: 4 };

/** Where the chunks start: after the signature. */
const FIRST_CHUNK = 8;

/** The concatenated data of every IDAT chunk, which together hold the compressed pixels. */
function imageData(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [];
  for (let at = FIRST_CHUNK; at + 8 <= bytes.length;) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type === 'IDAT') parts.push(bytes.subarray(at + 8, at + 8 + length));
    // Length, type, data and CRC.
    at += 12 + length;
  }
  return new Uint8Array(Buffer.concat(parts));
}

/** The Paeth predictor of the PNG specification: the neighbour closest to `a + b - c`. */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Undoes the filters row by row, giving the raw bytes of each row. */
function unfilter(raw: Uint8Array, height: number, stride: number, bpp: number): Uint8Array[] {
  const rows: Uint8Array[] = [];
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const filter = raw[start] ?? 0;
    const line = raw.slice(start + 1, start + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? (line[x - bpp] ?? 0) : 0;
      const b = previous[x] ?? 0;
      const c = x >= bpp ? (previous[x - bpp] ?? 0) : 0;
      const predictors = [0, a, b, (a + b) >> 1, paeth(a, b, c)];
      const predictor = predictors[filter];
      if (predictor === undefined) throw new Error(`row ${y} uses the unknown filter ${filter}`);
      line[x] = ((line[x] ?? 0) + predictor) & 0xff;
    }
    rows.push(line);
    previous = line;
  }
  return rows;
}

/**
 * Every opaque colour of the image as 0xRRGGBB, once each, in reading order (row by row, left to
 * right). Fully transparent pixels are skipped: they are the empty cells of a palette sheet.
 */
export function pngColours(bytes: Uint8Array): number[] {
  const { width, height } = pngSize(bytes);
  const [depth, colourType, , , interlace] = bytes.subarray(24, 29);
  if (depth !== 8) throw new Error(`only 8-bit images are read, not ${depth}-bit`);
  const bpp = CHANNELS[colourType ?? -1];
  if (bpp === undefined) {
    throw new Error(`only RGB and RGBA images are read, not type ${colourType}`);
  }
  if (interlace !== 0) throw new Error('interlaced images are not read');
  const rows = unfilter(inflateSync(imageData(bytes)), height, width * bpp, bpp);
  const seen = new Set<number>();
  const colours: number[] = [];
  for (const row of rows) {
    for (let x = 0; x < width; x++) {
      const [r = 0, g = 0, b = 0, alpha = 255] = row.subarray(x * bpp, x * bpp + bpp);
      const colour = (r << 16) | (g << 8) | b;
      if (bpp === 4 && alpha === 0) continue;
      if (seen.has(colour)) continue;
      seen.add(colour);
      colours.push(colour);
    }
  }
  return colours;
}
