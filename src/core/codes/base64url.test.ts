import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeBase64Url, encodeBase64Url } from './base64url';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('base64url', () => {
  it('encodes the RFC 4648 test vectors, without padding', () => {
    const text = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
    expect(encodeBase64Url(text(''))).toBe('');
    expect(encodeBase64Url(text('f'))).toBe('Zg');
    expect(encodeBase64Url(text('fo'))).toBe('Zm8');
    expect(encodeBase64Url(text('foo'))).toBe('Zm9v');
    expect(encodeBase64Url(text('foobar'))).toBe('Zm9vYmFy');
  });

  it('uses the URL-safe alphabet', () => {
    expect(encodeBase64Url(bytes(0xfb, 0xff))).toBe('-_8');
  });

  it('decodes back, and says where a character is not allowed', () => {
    expect(decodeBase64Url('Zm9v')).toEqual({ ok: true, value: bytes(102, 111, 111) });
    expect(decodeBase64Url('Zm+v')).toEqual({
      ok: false,
      error: { code: 'badCharacter', index: 2 },
    });
  });

  it('rejects a length no byte string can have', () => {
    expect(decodeBase64Url('Z')).toEqual({ ok: false, error: { code: 'badLength', length: 1 } });
  });

  it('property: decoding undoes encoding', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 64 }), (data) => {
        expect(decodeBase64Url(encodeBase64Url(data))).toEqual({ ok: true, value: data });
      }),
    );
  });
});
