import { describe, expect, it } from 'vitest';
import { encodeWav, halveRate, mixToMono, parseWav, toMono22k } from '../tools/assets/wav';

/** A stereo 44.1 kHz recording whose left and right channels hold the given samples. */
function stereo(left: readonly number[], right: readonly number[]): Uint8Array {
  return encodeWav({
    sampleRate: 44100,
    channels: [Int16Array.from(left), Int16Array.from(right)],
  });
}

/** Inserts an extra chunk (as packs do with LIST / id3 tags) right after the fmt chunk. */
function withTagChunk(wav: Uint8Array): Uint8Array {
  const tag = Buffer.alloc(8 + 3 + 1);
  tag.write('LIST', 0, 'ascii');
  tag.writeUInt32LE(3, 4);
  tag.write('abc', 8, 'ascii');
  // An odd chunk size is followed by one pad byte.
  const out = Buffer.concat([Buffer.from(wav.subarray(0, 36)), tag, Buffer.from(wav.subarray(36))]);
  out.writeUInt32LE(out.length - 8, 4);
  return new Uint8Array(out);
}

describe('16-bit PCM wave files', () => {
  it('reads back what it writes', () => {
    const audio = parseWav(stereo([1, -2, 32767], [-32768, 5, 0]));
    expect(audio.sampleRate).toBe(44100);
    expect(audio.channels.map((channel) => [...channel])).toEqual([
      [1, -2, 32767],
      [-32768, 5, 0],
    ]);
  });

  it('writes a canonical 44-byte header before the samples', () => {
    const wav = Buffer.from(encodeWav({ sampleRate: 22050, channels: [Int16Array.from([7, 8])] }));
    expect(wav.length).toBe(44 + 4);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ');
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(22050);
    expect(wav.readUInt32LE(28)).toBe(22050 * 2);
    expect(wav.readUInt16LE(32)).toBe(2);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.toString('ascii', 36, 40)).toBe('data');
    expect(wav.readUInt32LE(40)).toBe(4);
  });

  it('skips chunks it does not need, padding included', () => {
    const audio = parseWav(withTagChunk(stereo([3, 4], [5, 6])));
    expect(audio.channels.map((channel) => [...channel])).toEqual([
      [3, 4],
      [5, 6],
    ]);
  });

  it('mixes channels to mono by averaging them', () => {
    const mono = mixToMono(parseWav(stereo([100, -100, 32767], [300, -301, 32767])));
    expect(mono.channels.map((channel) => [...channel])).toEqual([[200, -200, 32767]]);
  });

  it('halves the rate by averaging each pair of samples', () => {
    const half = halveRate({ sampleRate: 44100, channels: [Int16Array.from([0, 10, 20, 31, 9])] });
    expect(half.sampleRate).toBe(22050);
    expect([...(half.channels[0] ?? [])]).toEqual([5, 26]);
  });

  it('turns a stereo 44.1 kHz file into mono 22.05 kHz with half the samples', () => {
    const left = Array.from({ length: 100 }, (_, i) => i * 10);
    const right = Array.from({ length: 100 }, (_, i) => -i * 10);
    const out = parseWav(toMono22k(stereo(left, right)));
    expect(out.sampleRate).toBe(22050);
    expect(out.channels).toHaveLength(1);
    expect(out.channels[0]).toHaveLength(50);
    expect([...(out.channels[0] ?? [])].every((sample) => sample === 0)).toBe(true);
  });

  it('keeps a mono file that is already at 22.05 kHz as it is', () => {
    const wav = encodeWav({ sampleRate: 22050, channels: [Int16Array.from([1, 2, 3])] });
    expect(toMono22k(wav)).toEqual(wav);
  });

  it('rejects a rate it cannot halve to 22.05 kHz', () => {
    const wav = encodeWav({ sampleRate: 48000, channels: [Int16Array.from([1])] });
    expect(() => toMono22k(wav)).toThrow(/48000/);
  });

  it('rejects files that are not 16-bit PCM wave', () => {
    expect(() =>
      parseWav(new Uint8Array(Buffer.from('OggS and more bytes here..........'))),
    ).toThrow(/not a wave/);
    const float = Buffer.from(stereo([1], [1]));
    float.writeUInt16LE(3, 20);
    expect(() => parseWav(new Uint8Array(float))).toThrow(/16-bit PCM/);
    const noData = Buffer.from(stereo([1], [1])).subarray(0, 36);
    expect(() => parseWav(new Uint8Array(noData))).toThrow(/no fmt or data/);
  });
});
