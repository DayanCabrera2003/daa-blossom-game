// Reads entries out of a zip archive with nothing but node:zlib, so extracting the chosen files of
// the asset packs needs no dependency. Only what the packs use is supported: stored and deflated
// entries of a plain (not zip64, not encrypted) archive.
import { crc32, inflateRawSync } from 'node:zlib';

/** Signatures of the three zip records this reader walks. */
const END_OF_DIRECTORY = 0x06054b50;
const CENTRAL_HEADER = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

/** Fixed sizes of those records, before their variable-length name, extra field and comment. */
const END_SIZE = 22;
const CENTRAL_SIZE = 46;
const LOCAL_SIZE = 30;

/** Compression methods: kept as-is, or raw deflate. */
const STORED = 0;
const DEFLATE = 8;

/** What the central directory says about one entry. */
interface EntryInfo {
  readonly method: number;
  readonly crc: number;
  readonly compressedSize: number;
  readonly size: number;
  readonly localOffset: number;
}

/** An opened archive: its entry names in directory order, and the bytes of any entry. */
export interface ZipArchive {
  names(): string[];
  /** The uncompressed bytes of `name`; throws, naming it, when the archive has no such entry. */
  read(name: string): Uint8Array;
}

/**
 * Finds the end-of-central-directory record, which sits at the very end of the archive unless a
 * comment (at most 65535 bytes) follows it, so it is searched for backwards.
 */
function findEnd(view: DataView): number {
  const last = view.byteLength - END_SIZE;
  const first = Math.max(0, last - 0xffff);
  for (let at = last; at >= first; at--) {
    if (view.getUint32(at, true) === END_OF_DIRECTORY) return at;
  }
  throw new Error('not a zip archive: no end of central directory');
}

/** Reads the central directory: every entry's name and where and how its bytes are stored. */
function readDirectory(bytes: Uint8Array, view: DataView): Map<string, EntryInfo> {
  const end = findEnd(view);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const decoder = new TextDecoder('utf-8');
  const entries = new Map<string, EntryInfo>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CENTRAL_HEADER) {
      throw new Error(`not a zip archive: broken central directory at entry ${i}`);
    }
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const name = decoder.decode(bytes.subarray(at + CENTRAL_SIZE, at + CENTRAL_SIZE + nameLength));
    const info: EntryInfo = {
      method: view.getUint16(at + 10, true),
      crc: view.getUint32(at + 16, true),
      compressedSize: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      localOffset: view.getUint32(at + 42, true),
    };
    // 0xffffffff in a size or offset means the real value lives in a zip64 extra field.
    if (info.compressedSize === 0xffffffff || info.localOffset === 0xffffffff) {
      throw new Error(`zip64 entries are not supported: ${name}`);
    }
    entries.set(name, info);
    at += CENTRAL_SIZE + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** The bytes of one entry, uncompressed and checked against the size and CRC-32 recorded. */
function readEntry(bytes: Uint8Array, view: DataView, name: string, info: EntryInfo): Uint8Array {
  const local = info.localOffset;
  if (view.getUint32(local, true) !== LOCAL_HEADER) {
    throw new Error(`not a zip archive: no local header for ${name}`);
  }
  // The local header repeats the name and may carry its own extra field before the data.
  const start =
    local + LOCAL_SIZE + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
  const body = bytes.subarray(start, start + info.compressedSize);
  let data: Uint8Array;
  if (info.method === STORED) data = body.slice();
  else if (info.method === DEFLATE) data = new Uint8Array(inflateRawSync(body));
  else throw new Error(`unsupported compression method ${info.method} for ${name}`);
  if (data.length !== info.size || crc32(data) !== info.crc) {
    throw new Error(`checksum mismatch for ${name}: the archive is corrupted`);
  }
  return data;
}

/** Opens a zip archive held in memory. The directory is read once; entries are read on demand. */
export function openZip(bytes: Uint8Array): ZipArchive {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < END_SIZE) throw new Error('not a zip archive: too short');
  const entries = readDirectory(bytes, view);
  return {
    names: () => [...entries.keys()],
    read: (name) => {
      const info = entries.get(name);
      if (info === undefined) throw new Error(`the archive has no entry ${name}`);
      return readEntry(bytes, view, name, info);
    },
  };
}
