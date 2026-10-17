// Reads and writes 16-bit PCM wave files, and shrinks the pack recordings (stereo, 44.1 kHz) to
// mono at 22.05 kHz: short effects and babble syllables lose nothing audible and weigh a quarter.

/** Decoded audio: the sample rate and one array of 16-bit samples per channel. */
export interface PcmAudio {
  readonly sampleRate: number;
  readonly channels: readonly Int16Array[];
}

/** The rate every extracted wave file ends at, and the rate the packs record at (twice it). */
const TARGET_RATE = 22050;

/** The WAVE_FORMAT_PCM tag of the fmt chunk. */
const PCM = 1;

/** Size of the canonical header written by `encodeWav`: RIFF, fmt (16 bytes) and data headers. */
const HEADER_SIZE = 44;

/** Clamps and rounds a mixed value back into the 16-bit range. */
const toInt16 = (value: number): number => Math.max(-32768, Math.min(32767, Math.round(value)));

/**
 * Parses a RIFF/WAVE file of 16-bit PCM samples. Chunks other than `fmt ` and `data` (the LIST and
 * id3 tags of the packs) are skipped; every chunk is word-aligned, so an odd size has a pad byte.
 */
export function parseWav(bytes: Uint8Array): PcmAudio {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (at: number): string =>
    String.fromCharCode(...bytes.subarray(at, Math.min(at + 4, bytes.length)));
  if (bytes.length < 12 || ascii(0) !== 'RIFF' || ascii(8) !== 'WAVE') {
    throw new Error('not a wave file: no RIFF/WAVE header');
  }
  let format: { channels: number; sampleRate: number } | null = null;
  let data: Uint8Array | null = null;
  for (let at = 12; at + 8 <= bytes.length;) {
    const id = ascii(at);
    const size = view.getUint32(at + 4, true);
    if (id === 'fmt ') {
      if (view.getUint16(at + 8, true) !== PCM || view.getUint16(at + 22, true) !== 16) {
        throw new Error('only 16-bit PCM wave files are supported');
      }
      format = {
        channels: view.getUint16(at + 10, true),
        sampleRate: view.getUint32(at + 12, true),
      };
    } else if (id === 'data') {
      data = bytes.subarray(at + 8, Math.min(at + 8 + size, bytes.length));
    }
    at += 8 + size + (size % 2);
  }
  if (format === null || data === null) throw new Error('not a wave file: no fmt or data chunk');

  // Samples are interleaved: frame f holds one little-endian sample per channel.
  const { channels: count, sampleRate } = format;
  const frames = Math.floor(data.length / (2 * count));
  const samples = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const channels = Array.from({ length: count }, () => new Int16Array(frames));
  for (let f = 0; f < frames; f++) {
    channels.forEach((channel, c) => {
      channel[f] = samples.getInt16((f * count + c) * 2, true);
    });
  }
  return { sampleRate, channels };
}

/** Averages every channel into one, frame by frame. */
export function mixToMono(audio: PcmAudio): PcmAudio {
  const frames = audio.channels[0]?.length ?? 0;
  const mono = new Int16Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (const channel of audio.channels) sum += channel[f] ?? 0;
    mono[f] = toInt16(sum / audio.channels.length);
  }
  return { sampleRate: audio.sampleRate, channels: [mono] };
}

/**
 * Halves the sample rate keeping the average of each pair of samples: the average is a small
 * low-pass filter, so dropping every other sample does not fold high notes back as noise. A last
 * sample without a partner is dropped.
 */
export function halveRate(audio: PcmAudio): PcmAudio {
  const channels = audio.channels.map((channel) => {
    const half = new Int16Array(Math.floor(channel.length / 2));
    for (let i = 0; i < half.length; i++) {
      half[i] = toInt16(((channel[2 * i] ?? 0) + (channel[2 * i + 1] ?? 0)) / 2);
    }
    return half;
  });
  return { sampleRate: audio.sampleRate / 2, channels };
}

/** Writes a canonical 16-bit PCM wave file: a 44-byte header and the interleaved samples. */
export function encodeWav(audio: PcmAudio): Uint8Array {
  const count = audio.channels.length;
  const frames = audio.channels[0]?.length ?? 0;
  const dataSize = frames * count * 2;
  const out = new Uint8Array(HEADER_SIZE + dataSize);
  const view = new DataView(out.buffer);
  const writeAscii = (at: number, text: string): void => {
    for (let i = 0; i < text.length; i++) out[at + i] = text.charCodeAt(i);
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, out.length - 8, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, PCM, true);
  view.setUint16(22, count, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let f = 0; f < frames; f++) {
    audio.channels.forEach((channel, c) => {
      view.setInt16(HEADER_SIZE + (f * count + c) * 2, channel[f] ?? 0, true);
    });
  }
  return out;
}

/** The conversion the extractor applies to every pack wave file: mono, 22.05 kHz, no tags. */
export function toMono22k(bytes: Uint8Array): Uint8Array {
  let audio = mixToMono(parseWav(bytes));
  if (audio.sampleRate === 2 * TARGET_RATE) audio = halveRate(audio);
  if (audio.sampleRate !== TARGET_RATE) {
    throw new Error(`cannot bring a ${audio.sampleRate} Hz wave file to ${TARGET_RATE} Hz`);
  }
  return encodeWav(audio);
}
