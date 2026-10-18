// The size of a PNG image read from its header, so the manifest can record it (and the tests can
// check that every named frame falls inside its sheet) without decoding any pixel.

/** The eight bytes every PNG file starts with. */
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Signature (8), IHDR length and type (8), then width and height (4 each). */
const HEADER_SIZE = 24;

/** Width and height in pixels. */
export interface ImageSize {
  readonly width: number;
  readonly height: number;
}

/** Reads the width and height from the IHDR chunk, which the format requires to come first. */
export function pngSize(bytes: Uint8Array): ImageSize {
  if (bytes.length < HEADER_SIZE || SIGNATURE.some((byte, i) => bytes[i] !== byte)) {
    throw new Error('not a PNG image: missing signature or header');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') {
    throw new Error('broken PNG image: the first chunk is not IHDR');
  }
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
