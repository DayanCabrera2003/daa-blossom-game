import { err, ok, type Result } from '../shared/result';

/** Why a string is not base64url. */
export type Base64UrlError =
  | { readonly code: 'badCharacter'; readonly index: number }
  | { readonly code: 'badLength'; readonly length: number };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VALUE = new Map([...ALPHABET].map((char, value) => [char, value]));

/**
 * Bytes as base64url without padding (RFC 4648 §5): safe in URLs and easy to copy, which is what a
 * shareable garden code needs. Written by hand because the core may not use browser APIs (`btoa`).
 * Every 3 bytes become 4 characters of 6 bits; a trailing 1 or 2 bytes become 2 or 3 characters.
 */
export function encodeBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const word = ((bytes[i] as number) << 16) | ((chunk[1] ?? 0) << 8) | (chunk[2] ?? 0);
    const chars = chunk.filter((byte) => byte !== undefined).length + 1;
    for (let k = 0; k < chars; k++) out += ALPHABET[(word >> (18 - 6 * k)) & 63];
  }
  return out;
}

/** The bytes of a base64url string, or where it goes wrong. */
export function decodeBase64Url(text: string): Result<Uint8Array, Base64UrlError> {
  // A group of 4 characters carries 3 bytes; a lone trailing character cannot carry a whole byte.
  if (text.length % 4 === 1) return err({ code: 'badLength', length: text.length });
  const values: number[] = [];
  for (const [index, char] of [...text].entries()) {
    const value = VALUE.get(char);
    if (value === undefined) return err({ code: 'badCharacter', index });
    values.push(value);
  }
  const bytes: number[] = [];
  for (let i = 0; i < values.length; i += 4) {
    const group = values.slice(i, i + 4);
    const word = group.reduce((acc, value, k) => acc | (value << (18 - 6 * k)), 0);
    for (let k = 0; k < group.length - 1; k++) bytes.push((word >> (16 - 8 * k)) & 255);
  }
  return ok(new Uint8Array(bytes));
}
