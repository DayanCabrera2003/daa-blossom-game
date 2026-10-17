import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { pngColourAt, pngColours } from '../tools/assets/pngColours';

/** One PNG chunk: length, type, data and a CRC the decoder does not check (left as zero). */
function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  return Buffer.concat([head, Buffer.from(data), Buffer.alloc(4)]);
}

/**
 * A PNG of `rows` (each a list of byte-per-channel pixels), every row stored with the filter
 * given for it. The filtered bytes are computed here the way an encoder would, so decoding them
 * back proves the decoder undoes each filter.
 */
function png(
  rows: readonly (readonly number[][])[],
  filters: readonly number[],
  { colourType = 6, depth = 8, interlace = 0, splitData = false } = {},
): Uint8Array {
  const channels = colourType === 6 ? 4 : 3;
  const width = rows[0]?.length ?? 0;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(rows.length, 4);
  ihdr.writeUInt8(depth, 8);
  ihdr.writeUInt8(colourType, 9);
  ihdr.writeUInt8(interlace, 12);
  const stride = width * channels;
  let previous = new Array<number>(stride).fill(0);
  const raw: number[] = [];
  rows.forEach((row, y) => {
    const line = row.flat();
    const filter = filters[y] ?? 0;
    raw.push(filter);
    line.forEach((byte, x) => {
      const a = x >= channels ? (line[x - channels] ?? 0) : 0;
      const b = previous[x] ?? 0;
      const c = x >= channels ? (previous[x - channels] ?? 0) : 0;
      const p = a + b - c;
      const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const paeth = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      const predictor = [0, a, b, (a + b) >> 1, paeth][filter] ?? 0;
      raw.push((byte - predictor) & 0xff);
    });
    previous = line;
  });
  const data = deflateSync(Buffer.from(raw));
  const half = data.length >> 1;
  const idat = splitData
    ? [chunk('IDAT', data.subarray(0, half)), chunk('IDAT', data.subarray(half))]
    : [chunk('IDAT', data)];
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('sRGB', new Uint8Array([0])),
      ...idat,
      chunk('IEND', new Uint8Array()),
    ]),
  );
}

const RED = [0xd1, 0x4b, 0x34, 255];
const BLUE = [0x4a, 0x52, 0x70, 255];
const CLEAR = [9, 9, 9, 0];

describe('the colours of a PNG image', () => {
  it('lists the opaque colours once each, in reading order, skipping transparent cells', () => {
    const image = png(
      [
        [RED, CLEAR, BLUE],
        [BLUE, RED, CLEAR],
      ],
      [0, 0],
    );
    expect(pngColours(image)).toEqual([0xd14b34, 0x4a5270]);
  });

  it.each([
    [1, 'sub'],
    [2, 'up'],
    [3, 'average'],
    [4, 'Paeth'],
  ])('undoes the %s filter (%s) on every row', (filter) => {
    const rows = [
      [RED, BLUE, [0xff, 0xff, 0xff, 255]],
      [[0x14, 0x1b, 0x1b, 255], RED, [0x79, 0xb8, 0xce, 255]],
      [[0xfc, 0xe2, 0xca, 255], [0x01, 0xfe, 0x80, 255], BLUE],
    ];
    expect(pngColours(png(rows, [filter, filter, filter]))).toEqual([
      0xd14b34, 0x4a5270, 0xffffff, 0x141b1b, 0x79b8ce, 0xfce2ca, 0x01fe80,
    ]);
  });

  it('reads RGB images without alpha, and data split over several IDAT chunks', () => {
    const rows = [
      [
        [1, 2, 3],
        [4, 5, 6],
      ],
      [
        [7, 8, 9],
        [1, 2, 3],
      ],
    ];
    expect(pngColours(png(rows, [1, 4], { colourType: 2, splitData: true }))).toEqual([
      0x010203, 0x040506, 0x070809,
    ]);
  });

  it('refuses what it cannot read: other depths, palettes, interlacing, unknown filters', () => {
    expect(() => pngColours(png([[RED]], [0], { depth: 16 }))).toThrow(/8-bit/);
    expect(() => pngColours(png([[RED]], [0], { colourType: 3 }))).toThrow(/RGB/);
    expect(() => pngColours(png([[RED]], [0], { interlace: 1 }))).toThrow(/interlaced/);
    expect(() => pngColours(png([[RED]], [7]))).toThrow(/filter 7/);
  });

  it('reads the colour of one pixel, and null where the image is transparent', () => {
    const image = png(
      [
        [RED, CLEAR, BLUE],
        [BLUE, RED, CLEAR],
      ],
      [0, 2],
    );
    expect(pngColourAt(image, 2, 0)).toBe(0x4a5270);
    expect(pngColourAt(image, 1, 1)).toBe(0xd14b34);
    expect(pngColourAt(image, 1, 0)).toBeNull();
    expect(() => pngColourAt(image, 3, 0)).toThrow(/outside/);
  });
});
