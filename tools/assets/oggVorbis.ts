// Reads the facts of an Ogg Vorbis file from its pages: how many channels, at what rate, and how
// long it lasts. Enough for the check of the audio fallbacks (plan 09, phase 8), without decoding.

/** The channels, the sample rate and the length in milliseconds of an Ogg Vorbis stream. */
export interface OggVorbisInfo {
  readonly channels: number;
  readonly sampleRate: number;
  readonly durationMs: number;
}

/** The capture pattern every Ogg page starts with. */
const CAPTURE = [0x4f, 0x67, 0x67, 0x53];
/** The fixed part of a page header, before its segment table. */
const PAGE_HEADER = 27;

const isPageAt = (bytes: Uint8Array, at: number): boolean =>
  CAPTURE.every((byte, i) => bytes[at + i] === byte);

/**
 * Reads `bytes` as an Ogg Vorbis file. The first page holds the identification header (packet
 * type 1, "vorbis", version, channels, rate); the last page's granule position is the number of
 * samples per channel in the stream, so the length is it over the rate.
 */
export function oggVorbisInfo(bytes: Uint8Array): OggVorbisInfo {
  if (bytes.length < PAGE_HEADER || !isPageAt(bytes, 0)) throw new Error('not an Ogg file');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const segments = bytes[26] ?? 0;
  const packet = PAGE_HEADER + segments;
  const tag = String.fromCharCode(...bytes.subarray(packet + 1, packet + 7));
  if (bytes[packet] !== 1 || tag !== 'vorbis' || packet + 16 > bytes.length) {
    throw new Error('not an Ogg Vorbis file: no Vorbis identification header');
  }
  const channels = view.getUint8(packet + 11);
  const sampleRate = view.getUint32(packet + 12, true);
  let last = 0;
  for (let at = bytes.length - PAGE_HEADER; at > 0; at--) {
    if (isPageAt(bytes, at)) {
      last = at;
      break;
    }
  }
  const samples = Number(view.getBigUint64(last + 6, true));
  return { channels, sampleRate, durationMs: (samples / sampleRate) * 1000 };
}
