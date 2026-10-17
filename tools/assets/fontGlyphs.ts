// The characters a TrueType font can draw, read from its `cmap` table, so a test can prove that
// every character the game writes has a glyph in the chosen pixel font (plan 06, section 1.2).
// Only the Unicode subtables of formats 4 (the Basic Multilingual Plane) and 12 (every plane)
// are read: they are what fonts for the web carry.

/** A subtable of the cmap table: its platform, encoding and where it starts in the file. */
interface Subtable {
  readonly platform: number;
  readonly encoding: number;
  readonly format: number;
  readonly at: number;
}

/** Whether a (platform, encoding) pair maps Unicode code points: platform 0, or Windows 1 / 10. */
const isUnicode = ({ platform, encoding }: Subtable): boolean =>
  platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));

/** Where the table with `tag` starts, from the table directory at the top of the file. */
function tableOffset(view: DataView, tag: string): number {
  const count = view.getUint16(4);
  for (let i = 0; i < count; i++) {
    const record = 12 + 16 * i;
    const name = String.fromCharCode(...[0, 1, 2, 3].map((k) => view.getUint8(record + k)));
    if (name === tag) return view.getUint32(record + 8);
  }
  throw new Error(`the font has no ${tag} table`);
}

/** The code points of a format 4 subtable whose glyph is not the missing glyph 0. */
function readFormat4(view: DataView, at: number): number[] {
  const segments = view.getUint16(at + 6) / 2;
  const ends = at + 14;
  const starts = ends + 2 * segments + 2;
  const deltas = starts + 2 * segments;
  const ranges = deltas + 2 * segments;
  const out: number[] = [];
  for (let s = 0; s < segments; s++) {
    const start = view.getUint16(starts + 2 * s);
    const end = view.getUint16(ends + 2 * s);
    const delta = view.getUint16(deltas + 2 * s);
    const slot = ranges + 2 * s;
    const range = view.getUint16(slot);
    // The closing segment for 0xFFFF maps nothing.
    for (let code = start; code <= end && code !== 0xffff; code++) {
      // A zero range offset maps by delta alone; otherwise through a glyph list (0 stays 0).
      const listed = range === 0 ? code : view.getUint16(slot + range + 2 * (code - start));
      const glyph = range !== 0 && listed === 0 ? 0 : (listed + delta) & 0xffff;
      if (glyph !== 0) out.push(code);
    }
  }
  return out;
}

/** The code points of a format 12 subtable whose glyph is not the missing glyph 0. */
function readFormat12(view: DataView, at: number): number[] {
  const groups = view.getUint32(at + 12);
  const out: number[] = [];
  for (let g = 0; g < groups; g++) {
    const group = at + 16 + 12 * g;
    const start = view.getUint32(group);
    const end = view.getUint32(group + 4);
    const first = view.getUint32(group + 8);
    for (let code = start; code <= end; code++) {
      if (first + (code - start) !== 0) out.push(code);
    }
  }
  return out;
}

/**
 * Every code point the font maps to a real glyph, ascending. A format 12 subtable is preferred,
 * as it covers every plane; otherwise the format 4 one. Throws when the font has neither.
 */
export function fontGlyphs(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cmap = tableOffset(view, 'cmap');
  const subtables: Subtable[] = [];
  for (let i = 0; i < view.getUint16(cmap + 2); i++) {
    const record = cmap + 4 + 8 * i;
    const at = cmap + view.getUint32(record + 4);
    subtables.push({
      platform: view.getUint16(record),
      encoding: view.getUint16(record + 2),
      format: view.getUint16(at),
      at,
    });
  }
  const unicode = subtables.filter(isUnicode);
  const full = unicode.find((table) => table.format === 12);
  const bmp = unicode.find((table) => table.format === 4);
  const codes =
    full !== undefined
      ? readFormat12(view, full.at)
      : bmp !== undefined
        ? readFormat4(view, bmp.at)
        : null;
  if (codes === null) throw new Error('the font has no Unicode cmap subtable of format 4 or 12');
  return [...new Set(codes)].sort((a, b) => a - b);
}
