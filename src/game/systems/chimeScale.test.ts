import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ASSET_KEYS, assetEntry } from '../assets/keys';
import { CHIME_KEYS, chimeKey, chimeNotes } from './chimeScale';

describe('the notes of a chain', () => {
  it('has fifteen chimes, each an effect of the manifest', () => {
    expect(CHIME_KEYS).toHaveLength(15);
    for (const key of CHIME_KEYS) {
      expect(ASSET_KEYS).toContain(key);
      expect(assetEntry(key).kind).toBe('sfx');
    }
  });

  it('rings the i-th note on the i-th hop', () => {
    expect(chimeNotes(3)).toEqual([0, 1, 2]);
    expect(chimeKey(0)).toBe('sfx.chime1');
    expect(chimeKey(14)).toBe('sfx.chime15');
  });

  it('plays k strictly rising notes for a chain of k ≤ 15 hops', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 15 }), (k) => {
        const notes = chimeNotes(k);
        expect(notes).toHaveLength(k);
        notes.slice(1).forEach((note, i) => expect(note).toBeGreaterThan(notes[i] ?? Infinity));
      }),
    );
  });

  it('never goes down on a longer chain, staying on the top note', () => {
    fc.assert(
      fc.property(fc.integer({ min: 16, max: 60 }), (k) => {
        const notes = chimeNotes(k);
        expect(notes).toHaveLength(k);
        notes.slice(1).forEach((note, i) => expect(note).toBeGreaterThanOrEqual(notes[i] ?? 0));
        expect(Math.max(...notes)).toBe(14);
      }),
    );
  });

  it('keeps any hop on the scale', () => {
    expect(chimeKey(-1)).toBe('sfx.chime1');
    expect(chimeKey(40)).toBe('sfx.chime15');
  });

  it('plays nothing for a chain without hops', () => {
    expect(chimeNotes(0)).toEqual([]);
  });
});
