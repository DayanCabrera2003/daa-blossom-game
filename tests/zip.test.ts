import { describe, expect, it } from 'vitest';
import { openZip } from '../tools/assets/zip';
import { buildZip } from './support/buildZip';

const bytes = (text: string): Uint8Array => new Uint8Array(Buffer.from(text, 'utf8'));

// A long, repetitive body so deflate really shrinks it.
const LONG = bytes('sprout '.repeat(500));

const ZIP = buildZip([
  { name: 'pack/License.txt', data: bytes('CC0'), method: 'stored' },
  { name: 'pack/Audio/Whoosh & Slash/Whoosh2.wav', data: LONG, method: 'deflate' },
  { name: 'pack/empty.txt', data: new Uint8Array(0), method: 'stored' },
]);

describe('reading a zip archive', () => {
  it('lists every entry of the central directory, in order', () => {
    expect(openZip(ZIP).names()).toEqual([
      'pack/License.txt',
      'pack/Audio/Whoosh & Slash/Whoosh2.wav',
      'pack/empty.txt',
    ]);
  });

  it('returns a stored entry byte for byte', () => {
    expect(openZip(ZIP).read('pack/License.txt')).toEqual(bytes('CC0'));
  });

  it('inflates a deflated entry byte for byte', () => {
    expect(openZip(ZIP).read('pack/Audio/Whoosh & Slash/Whoosh2.wav')).toEqual(LONG);
  });

  it('returns an empty entry as no bytes', () => {
    expect(openZip(ZIP).read('pack/empty.txt')).toEqual(new Uint8Array(0));
  });

  it('names the entry that does not exist', () => {
    expect(() => openZip(ZIP).read('pack/missing.png')).toThrow('pack/missing.png');
  });

  it('rejects bytes that are not a zip', () => {
    expect(() => openZip(bytes('not a zip at all, just text'))).toThrow(/not a zip/);
  });

  it('rejects an entry whose bytes were corrupted', () => {
    const broken = ZIP.slice();
    // The stored body "CC0" starts right after the first local header (30 bytes) and its name.
    const body = 30 + 'pack/License.txt'.length;
    broken[body] = 'X'.charCodeAt(0);
    expect(() => openZip(broken).read('pack/License.txt')).toThrow(/checksum/);
  });

  it('rejects a compression method it does not know', () => {
    const odd = ZIP.slice();
    const view = new DataView(odd.buffer);
    // The method of the first entry, in its central header (after the three local records).
    const central = odd.length - 22 - view.getUint32(odd.length - 22 + 12, true);
    view.setUint16(central + 10, 14, true);
    expect(() => openZip(odd).read('pack/License.txt')).toThrow(/method 14/);
  });
});
