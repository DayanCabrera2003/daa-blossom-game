import { describe, expect, it } from 'vitest';
import { fontGlyphs } from '../tools/assets/fontGlyphs';

/** A big-endian byte writer, enough to lay out the tables of a test font. */
class Bytes {
  private readonly parts: number[] = [];
  u16(...values: number[]): this {
    for (const v of values) this.parts.push((v >> 8) & 0xff, v & 0xff);
    return this;
  }
  u32(...values: number[]): this {
    for (const v of values) this.u16((v >>> 16) & 0xffff, v & 0xffff);
    return this;
  }
  get length(): number {
    return this.parts.length;
  }
  bytes(): number[] {
    return [...this.parts];
  }
}

/** A format 4 segment: a run of codes and how they map to glyphs. */
interface Segment {
  readonly start: number;
  readonly end: number;
  readonly delta: number;
  /** When given, the codes map through this glyph list instead of by delta alone. */
  readonly glyphs?: readonly number[];
}

/** A format 4 subtable (the Basic Multilingual Plane by segments), closed by the 0xFFFF segment. */
function format4(segments: readonly Segment[]): number[] {
  const all = [...segments, { start: 0xffff, end: 0xffff, delta: 1 }];
  const n = all.length;
  // Glyph lists follow the idRangeOffset array, each segment's offset counted from its own slot.
  const lists: number[] = [];
  const offsets = all.map((segment, i) => {
    if (segment.glyphs === undefined) return 0;
    const offset = 2 * (n - i) + 2 * lists.length;
    lists.push(...segment.glyphs);
    return offset;
  });
  const body = new Bytes()
    .u16(...all.map((s) => s.end))
    .u16(0)
    .u16(...all.map((s) => s.start))
    .u16(...all.map((s) => s.delta & 0xffff))
    .u16(...offsets)
    .u16(...lists);
  const head = new Bytes().u16(4, 14 + body.length, 0, 2 * n, 0, 0, 0);
  return [...head.bytes(), ...body.bytes()];
}

/** A format 12 subtable: groups of consecutive codes mapped to consecutive glyphs. */
function format12(groups: readonly [number, number, number][]): number[] {
  const out = new Bytes().u16(12, 0).u32(16 + 12 * groups.length, 0, groups.length);
  for (const [start, end, glyph] of groups) out.u32(start, end, glyph);
  return out.bytes();
}

/** A cmap table with the given (platform, encoding, subtable) records. */
function cmap(records: readonly [number, number, number[]][]): number[] {
  const head = new Bytes().u16(0, records.length);
  let offset = 4 + 8 * records.length;
  for (const [platform, encoding, table] of records) {
    head.u16(platform, encoding).u32(offset);
    offset += table.length;
  }
  return [...head.bytes(), ...records.flatMap(([, , table]) => table)];
}

/** A TrueType file holding the given tables, which is all the reader looks at. */
function font(tables: Record<string, number[]>): Uint8Array {
  const tags = Object.keys(tables);
  const dir = new Bytes().u32(0x00010000).u16(tags.length, 0, 0, 0);
  let offset = 12 + 16 * tags.length;
  for (const tag of tags) {
    const data = tables[tag] ?? [];
    const word = [...tag].reduce((sum, ch) => sum * 256 + ch.charCodeAt(0), 0);
    dir.u32(word, 0, offset, data.length);
    offset += data.length;
  }
  return new Uint8Array([...dir.bytes(), ...tags.flatMap((tag) => tables[tag] ?? [])]);
}

const codes = (text: string): number[] => [...text].map((ch) => ch.codePointAt(0) ?? 0);

describe('the characters a TrueType font draws', () => {
  it('reads a format 4 table: codes mapped by delta, and through a glyph list', () => {
    const table = format4([
      { start: 0x41, end: 0x43, delta: -0x40 }, // A B C → glyphs 1 2 3
      // ñ ò ó: ò maps to glyph 0, the missing glyph, so the font does not draw it.
      { start: 0xf1, end: 0xf3, delta: 0, glyphs: [4, 0, 5] },
    ]);
    expect(fontGlyphs(font({ head: [0], cmap: cmap([[3, 1, table]]) }))).toEqual(codes('ABCñó'));
  });

  it('skips a code whose delta lands on the missing glyph', () => {
    const table = format4([{ start: 0x20, end: 0x21, delta: -0x20 }]);
    expect(fontGlyphs(font({ cmap: cmap([[0, 3, table]]) }))).toEqual(codes('!'));
  });

  it('prefers a full-repertoire format 12 table when the font has one', () => {
    const bmp = format4([{ start: 0x41, end: 0x41, delta: 1 }]);
    const full = format12([
      [0x2605, 0x2606, 7],
      [0x41, 0x42, 0],
    ]);
    expect(
      fontGlyphs(
        font({
          cmap: cmap([
            [3, 1, bmp],
            [3, 10, full],
          ]),
        }),
      ),
    ).toEqual(
      // Code 0x41 maps to glyph 0 in the group, so only 0x42 is drawn from it.
      codes('B★☆'),
    );
  });

  it('ignores subtables that are not Unicode, such as the old Macintosh one', () => {
    const roman = format4([{ start: 0x41, end: 0x5a, delta: 1 }]);
    const unicode = format4([{ start: 0x61, end: 0x61, delta: 1 }]);
    expect(
      fontGlyphs(
        font({
          cmap: cmap([
            [1, 0, roman],
            [3, 1, unicode],
          ]),
        }),
      ),
    ).toEqual(codes('a'));
  });

  it('refuses a font without a cmap table or without a Unicode subtable it can read', () => {
    expect(() => fontGlyphs(font({ head: [0] }))).toThrow(/cmap/);
    const roman = format4([{ start: 0x41, end: 0x5a, delta: 1 }]);
    expect(() => fontGlyphs(font({ cmap: cmap([[1, 0, roman]]) }))).toThrow(/Unicode/);
    expect(() => fontGlyphs(font({ cmap: cmap([[3, 1, [0, 6, 0, 0]]]) }))).toThrow(/Unicode/);
  });
});
