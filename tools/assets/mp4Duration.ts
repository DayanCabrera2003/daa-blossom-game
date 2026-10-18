// Reads how long an MP4 file (AAC in `.m4a`, the audio fallbacks of plan 09, phase 8) lasts, from
// its movie header, without decoding: what the check of the fallbacks compares with the original.

/** The four-letter type of the box at `at`. */
const typeAt = (bytes: Uint8Array, at: number): string =>
  String.fromCharCode(...bytes.subarray(at + 4, at + 8));

/** The movie header's offset among the boxes from `start` to `end`, looking inside `moov`. */
function findMvhd(bytes: Uint8Array, view: DataView, start: number, end: number): number | null {
  for (let at = start; at + 8 <= end;) {
    const size = view.getUint32(at);
    if (size < 8 || at + size > end) return null;
    const type = typeAt(bytes, at);
    if (type === 'mvhd') return at;
    if (type === 'moov') return findMvhd(bytes, view, at + 8, at + size);
    at += size;
  }
  return null;
}

/**
 * The length of the MP4 file `bytes` in milliseconds: the movie header's duration over its time
 * scale (version 0 holds them in 32 bits, version 1 the duration in 64). The encoder writes there
 * the length of what plays, its priming samples cut by the edit list.
 */
export function mp4DurationMs(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const at = findMvhd(bytes, view, 0, bytes.length);
  if (at === null) throw new Error('not an MP4 file: no movie header (mvhd)');
  const body = at + 8;
  const version = view.getUint8(body);
  const timescale = view.getUint32(body + (version === 1 ? 20 : 12));
  const duration = version === 1 ? Number(view.getBigUint64(body + 24)) : view.getUint32(body + 16);
  return (duration / timescale) * 1000;
}
