import { describe, expect, it } from 'vitest';
import { pngSize } from '../tools/assets/pngSize';

/** The signature and IHDR chunk of a PNG of the given size; the pixels never matter here. */
function pngHeader(width: number, height: number): Uint8Array {
  const out = Buffer.alloc(8 + 8 + 13 + 4);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(out, 0);
  out.writeUInt32BE(13, 8);
  out.write('IHDR', 12, 'ascii');
  out.writeUInt32BE(width, 16);
  out.writeUInt32BE(height, 20);
  return new Uint8Array(out);
}

describe('size of a PNG image', () => {
  it('reads the width and height of the IHDR chunk', () => {
    expect(pngSize(pngHeader(352, 417))).toEqual({ width: 352, height: 417 });
  });

  it('rejects bytes without the PNG signature', () => {
    const notPng = pngHeader(16, 16);
    notPng[1] = 0;
    expect(() => pngSize(notPng)).toThrow(/not a PNG/);
  });

  it('rejects a PNG whose first chunk is not IHDR', () => {
    const odd = Buffer.from(pngHeader(16, 16));
    odd.write('IDAT', 12, 'ascii');
    expect(() => pngSize(new Uint8Array(odd))).toThrow(/IHDR/);
  });

  it('rejects a file too short to hold the header', () => {
    expect(() => pngSize(pngHeader(16, 16).subarray(0, 20))).toThrow(/not a PNG/);
  });
});
