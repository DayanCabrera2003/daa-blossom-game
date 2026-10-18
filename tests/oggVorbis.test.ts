import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { oggVorbisInfo } from '../tools/assets/oggVorbis';

/** An Ogg page: its header (granule position, one segment) and its body. */
function page(granule: bigint, body: Uint8Array): Uint8Array {
  const header = Buffer.alloc(28);
  header.write('OggS', 0, 'ascii');
  header.writeBigUInt64LE(granule, 6);
  header[26] = 1;
  header[27] = body.length;
  return new Uint8Array(Buffer.concat([header, Buffer.from(body)]));
}

/** The Vorbis identification header of `channels` at `rate`. */
function identification(channels: number, rate: number): Uint8Array {
  const body = Buffer.alloc(30);
  body[0] = 1;
  body.write('vorbis', 1, 'ascii');
  body[11] = channels;
  body.writeUInt32LE(rate, 12);
  return new Uint8Array(body);
}

/** A stream of an identification page and pages ending at the given granule positions. */
const stream = (channels: number, rate: number, granules: readonly bigint[]): Uint8Array =>
  new Uint8Array(
    Buffer.concat([
      page(0n, identification(channels, rate)),
      ...granules.map((granule) => page(granule, new Uint8Array([7, 7, 7]))),
    ]),
  );

describe('the facts of an Ogg Vorbis file', () => {
  it('reads its channels, its rate and its length from the last page', () => {
    expect(oggVorbisInfo(stream(2, 44100, [4410n, 88200n]))).toEqual({
      channels: 2,
      sampleRate: 44100,
      durationMs: 2000,
    });
  });

  it('reads a mono file', () => {
    expect(oggVorbisInfo(stream(1, 48000, [24000n])).channels).toBe(1);
  });

  it('refuses a file that is not Ogg Vorbis', () => {
    expect(() => oggVorbisInfo(new Uint8Array([1, 2, 3]))).toThrow(/Ogg/);
    const notVorbis = page(0n, new Uint8Array(30));
    expect(() => oggVorbisInfo(notVorbis)).toThrow(/Vorbis/);
  });

  it('reads a shipped track as long as its player says', () => {
    // ffprobe gives 51.692313 s for the hub's track.
    const hub = new Uint8Array(readFileSync('public/assets/audio/music/hub.ogg'));
    expect(oggVorbisInfo(hub)).toMatchObject({ channels: 2, sampleRate: 44100 });
    expect(oggVorbisInfo(hub).durationMs).toBeCloseTo(51692.313, 0);
  });
});
