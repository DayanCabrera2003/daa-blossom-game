import { describe, expect, it } from 'vitest';
import { mp4DurationMs } from '../tools/assets/mp4Duration';

/** A box of `type` holding `body`. */
function box(type: string, body: Uint8Array): Uint8Array {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + body.length, 0);
  header.write(type, 4, 'ascii');
  return new Uint8Array(Buffer.concat([header, Buffer.from(body)]));
}

/** A movie header of version 0 or 1 with its time scale and duration. */
function mvhd(version: 0 | 1, timescale: number, duration: number): Uint8Array {
  const body = Buffer.alloc(version === 0 ? 20 : 32);
  body[0] = version;
  if (version === 0) {
    body.writeUInt32BE(timescale, 12);
    body.writeUInt32BE(duration, 16);
  } else {
    body.writeUInt32BE(timescale, 20);
    body.writeBigUInt64BE(BigInt(duration), 24);
  }
  return box('mvhd', new Uint8Array(body));
}

const join = (...parts: Uint8Array[]): Uint8Array =>
  new Uint8Array(Buffer.concat(parts.map((part) => Buffer.from(part))));

describe('the length of an MP4 (AAC in .m4a) file', () => {
  it('reads the movie header of version 0, after other boxes', () => {
    const file = join(box('ftyp', new Uint8Array(8)), box('moov', mvhd(0, 1000, 51_692)));
    expect(mp4DurationMs(file)).toBe(51_692);
  });

  it('reads the movie header of version 1 at its own time scale', () => {
    const file = join(box('moov', join(box('free', new Uint8Array(4)), mvhd(1, 44100, 88200))));
    expect(mp4DurationMs(file)).toBe(2000);
  });

  it('refuses a file with no movie header', () => {
    expect(() => mp4DurationMs(box('ftyp', new Uint8Array(8)))).toThrow(/mvhd/);
    expect(() => mp4DurationMs(new Uint8Array([0, 0, 0, 4]))).toThrow(/mvhd/);
  });
});
