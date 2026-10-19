// What the shipped game weighs on the wire (plan 09, phase 9): GitHub Pages sends text compressed
// with gzip, so the budget reports each part compressed as well as raw; brotli is reported beside
// it, as some servers and CDNs send that instead. Pictures, sounds and woff2 fonts are compressed
// formats already and are sent as they are. Reported only: the limits stay on the raw bytes.
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import type { BudgetPart, BudgetRow } from './budget';

/**
 * The text a build writes, which a server compresses: scripts, stylesheets, pages, data, vector
 * pictures. Anything else (PNG, Ogg, AAC, wave, woff2, TrueType) is counted as it is, the stricter
 * reading for the font, which some servers do compress.
 */
const COMPRESSIBLE = /\.(?:js|mjs|css|html|json|svg|txt)$/;

/** Whether a server sends the file at `path` compressed. */
export function isCompressible(path: string): boolean {
  return COMPRESSIBLE.test(path);
}

/** A file to weigh: its path (for its type) and its bytes. */
export interface WeighedFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

/** A weight as it is and as each compression sends it. */
export interface Packed {
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
}

/**
 * The compressed streams of one file, at the strongest settings a static host uses when it
 * compresses ahead of time (gzip level 9, brotli quality 11, told it is text).
 */
export function packedStreams(file: WeighedFile): { gzip: Uint8Array; brotli: Uint8Array } {
  return {
    gzip: gzipSync(file.bytes, { level: 9 }),
    brotli: brotliCompressSync(file.bytes, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_SIZE_HINT]: file.bytes.length,
      },
    }),
  };
}

/** What one file weighs: compressed when it is text, as it is otherwise. */
function packedFile(file: WeighedFile): Packed {
  const raw = file.bytes.length;
  if (!isCompressible(file.path)) return { raw, gzip: raw, brotli: raw };
  const { gzip, brotli } = packedStreams(file);
  return { raw, gzip: gzip.length, brotli: brotli.length };
}

/** What `files` weigh together: text compressed, every other file as it is. */
export function packedSize(files: readonly WeighedFile[]): Packed {
  return files.map(packedFile).reduce<Packed>(
    (total, one) => ({
      raw: total.raw + one.raw,
      gzip: total.gzip + one.gzip,
      brotli: total.brotli + one.brotli,
    }),
    { raw: 0, gzip: 0, brotli: 0 },
  );
}

/** One part of the budget as it is sent: gzipped and brotli-compressed. */
export interface ServedRow {
  readonly part: BudgetPart;
  readonly gzip: number;
  readonly brotli: number;
}

/** The built parts of the budget, weighed from their files. */
export type BuiltPacked = Readonly<Record<'js' | 'codex' | 'sandbox' | 'level', Packed>>;

/**
 * Every part of `report` as it is sent: the built parts (the initial script, the books, the free
 * mode, the level screen) by their compressed files; the initial load as the compressed script plus the boot group,
 * sent as it is; every part of assets as it is.
 */
export function servedWeights(report: readonly BudgetRow[], built: BuiltPacked): ServedRow[] {
  return report.map(({ part, bytes }) => {
    switch (part) {
      case 'js':
      case 'codex':
      case 'sandbox':
      case 'level':
        return { part, gzip: built[part].gzip, brotli: built[part].brotli };
      case 'initial': {
        const boot = bytes - built.js.raw;
        return { part, gzip: boot + built.js.gzip, brotli: boot + built.js.brotli };
      }
      default:
        return { part, gzip: bytes, brotli: bytes };
    }
  });
}
