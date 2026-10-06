import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { completeGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { createMatching, emptyMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { encodeBase64Url } from './base64url';
import { decodeGarden, encodeGarden } from './gardenCode';

// Level 4.1: R–a=b, triangle b–c=d–b, c–e.
const festival = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const lanterns = unwrap(
  createMatching(festival, [
    [1, 2],
    [3, 4],
  ]),
);

/** A code made of raw bytes, to build broken codes on purpose. */
const raw = (...values: number[]) => encodeBase64Url(new Uint8Array(values));

describe('garden codes', () => {
  it('a small garden fits in a few characters, and comes back intact', () => {
    const code = encodeGarden(festival, lanterns);
    expect(code.length).toBeLessThanOrEqual(8);
    expect(decodeGarden(code)).toEqual({
      ok: true,
      value: { graph: festival, matching: lanterns },
    });
  });

  it('the empty garden has a code too', () => {
    const empty = unwrap(createGraph(0, []));
    expect(decodeGarden(encodeGarden(empty, emptyMatching(empty)))).toMatchObject({ ok: true });
  });

  it('property: decoding undoes encoding, and the code is canonical', () => {
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 14 }), ([graph, matching]) => {
        const code = encodeGarden(graph, matching);
        const decoded = unwrap(decodeGarden(code));
        expect(decoded).toEqual({ graph, matching });
        expect(encodeGarden(decoded.graph, decoded.matching)).toBe(code);
      }),
    );
  });

  it('says why a code is not a garden', () => {
    expect(decodeGarden('ab*c')).toMatchObject({ ok: false, error: { code: 'badText' } });
    expect(decodeGarden(raw(9, 2, 0))).toEqual({
      ok: false,
      error: { code: 'unknownVersion', version: 9 },
    });
    expect(decodeGarden(raw(1))).toEqual({ ok: false, error: { code: 'truncated' } });
    expect(decodeGarden(raw(1, 2, 0b10000000))).toEqual({
      ok: false,
      error: { code: 'truncated' },
    });
    expect(decodeGarden(raw(1, 2, 0b10000000, 0, 7))).toEqual({
      ok: false,
      error: { code: 'trailingData' },
    });
    // Two sprouts with no vine, but a stray 1 in the padding bits.
    expect(decodeGarden(raw(1, 2, 0b01000000))).toEqual({
      ok: false,
      error: { code: 'strayBits' },
    });
  });

  it('refuses lanterns that break exclusivity', () => {
    // The triangle 0–1–2 with all three vines lit: every sprout would hold two lanterns.
    expect(decodeGarden(raw(1, 3, 0b11100000, 0b11100000))).toMatchObject({
      ok: false,
      error: { code: 'badLanterns', error: { code: 'alreadyMatched' } },
    });
  });

  it('gardens have at most 255 sprouts', () => {
    expect(() => encodeGarden(completeGraph(256), emptyMatching(completeGraph(256)))).toThrow();
  });
});
