import { gunzipSync, brotliDecompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { BUDGET, budgetReport, type BudgetRow } from '../tools/assets/budget';
import {
  isCompressible,
  packedSize,
  packedStreams,
  servedWeights,
} from '../tools/assets/compressed';

// What each part of the budget weighs on the wire (plan 09, phase 9): GitHub Pages sends text
// compressed (gzip; brotli is reported too, as some servers and CDNs send it), while pictures,
// sounds and woff2 fonts are compressed already and go as they are. Reported, never limited.

const text = (path: string, body: string) => ({ path, bytes: new TextEncoder().encode(body) });

describe('isCompressible', () => {
  it('compresses the text the build writes', () => {
    for (const path of ['assets/index-x.js', 'assets/book.css', 'index.html', 'a/b.json']) {
      expect(isCompressible(path)).toBe(true);
    }
  });

  it('sends pictures, sounds and fonts as they are', () => {
    for (const path of ['a.png', 'b.ogg', 'c.m4a', 'd.wav', 'e.woff2', 'f.ttf']) {
      expect(isCompressible(path)).toBe(false);
    }
  });
});

describe('packedSize', () => {
  it('weighs text gzipped and brotli-compressed, each a real stream of the same bytes', () => {
    const file = text('a.js', 'const garden = "lantern";\n'.repeat(400));
    const packed = packedSize([file]);
    expect(packed.raw).toBe(file.bytes.length);
    expect(packed.gzip).toBeLessThan(packed.raw / 10);
    expect(packed.brotli).toBeLessThan(packed.raw / 10);
  });

  it('weighs every other file as it is, in all three', () => {
    const bytes = new Uint8Array(500).fill(7);
    expect(packedSize([{ path: 'a.png', bytes }])).toEqual({ raw: 500, gzip: 500, brotli: 500 });
  });

  it('sums the files and weighs nothing as nothing', () => {
    const a = text('a.css', 'body{margin:0}');
    const b = { path: 'b.woff2', bytes: new Uint8Array(40) };
    const packed = packedSize([a, b]);
    expect(packed.raw).toBe(a.bytes.length + 40);
    expect(packed.gzip).toBe(packedSize([a]).gzip + 40);
    expect(packedSize([])).toEqual({ raw: 0, gzip: 0, brotli: 0 });
  });

  it('measures streams that decompress back to the file', () => {
    // The sizes are of real streams: the same calls, decompressed, give the file again.
    const file = text('a.js', 'x'.repeat(1000));
    expect(gunzipSync(Buffer.from(packedStreams(file).gzip)).toString()).toBe('x'.repeat(1000));
    expect(brotliDecompressSync(Buffer.from(packedStreams(file).brotli)).toString()).toBe(
      'x'.repeat(1000),
    );
  });
});

describe('servedWeights', () => {
  const sizes = { images: 300, fonts: 30, sounds: 18, music: 7000, boot: 1348 };
  const report: BudgetRow[] = budgetReport({
    ...sizes,
    js: 500,
    codex: 900,
    sandbox: 70,
    level: 80,
  });
  const built = {
    js: { raw: 500, gzip: 150, brotli: 120 },
    codex: { raw: 900, gzip: 400, brotli: 350 },
    sandbox: { raw: 70, gzip: 20, brotli: 18 },
    level: { raw: 80, gzip: 30, brotli: 25 },
  };
  const served = servedWeights(report, built);
  const row = (part: BudgetRow['part']) => served.find((one) => one.part === part);

  it('weighs the built parts by their compressed files', () => {
    expect(row('js')).toEqual({ part: 'js', gzip: 150, brotli: 120 });
    expect(row('codex')).toEqual({ part: 'codex', gzip: 400, brotli: 350 });
    expect(row('sandbox')).toEqual({ part: 'sandbox', gzip: 20, brotli: 18 });
    expect(row('level')).toEqual({ part: 'level', gzip: 30, brotli: 25 });
  });

  it('weighs the initial load as the compressed script plus the boot group as it is', () => {
    expect(row('initial')).toEqual({ part: 'initial', gzip: 150 + 1348, brotli: 120 + 1348 });
  });

  it('weighs the assets as they are', () => {
    expect(row('images')).toEqual({ part: 'images', gzip: 300, brotli: 300 });
    expect(row('music')).toEqual({ part: 'music', gzip: 7000, brotli: 7000 });
  });

  it('gives one row per part of the budget, in its order', () => {
    expect(served.map((one) => one.part)).toEqual(Object.keys(BUDGET));
  });
});
