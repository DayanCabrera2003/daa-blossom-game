import strings from '@content/es/strings.json';
import type { ImportRejection } from '@levels/sandbox/importText';
import { MAX_IMPORT_LENGTH, MAX_SPROUTS, MAX_VINES } from '@levels/sandbox/limits';
import { createTranslator, missing } from '@services/i18n';
import { describe, expect, it } from 'vitest';
import { MATHEMATICS } from '../../../tests/support/vocabulary';
import {
  SHARE_TEXTS,
  fileFitsImport,
  gardenFilename,
  gardenLink,
  importReasonText,
  shareSheet,
} from './shareSheet';

const t = createTranslator(strings);

/** Every way a text opened in the sheet may be refused. */
const REJECTIONS: readonly ImportRejection[] = [
  'tooLong',
  'badJson',
  'badLevel',
  'badCode',
  'tooMany',
  'tooManyVines',
  'tooClose',
  'outside',
];

describe('the share sheet', () => {
  it('offers the code, its link and the file of a garden', () => {
    const sheet = shareSheet(
      { code: 'AQRA', json: '{"id": "9.1"}' },
      'https://example.org/florecer/?teacher#top',
    );
    expect(sheet.garden).toEqual({
      code: 'AQRA',
      link: 'https://example.org/florecer/?garden=AQRA',
      file: { filename: 'jardin-AQRA.json', type: 'application/json', text: '{"id": "9.1"}' },
    });
  });

  it('offers to download only when there is a file, and nothing but opening with no garden', () => {
    const noFile = shareSheet({ code: 'AQRA', json: null }, 'https://example.org/');
    expect(noFile.garden?.file).toBeNull();
    expect(shareSheet({ code: null, json: null }, 'https://example.org/').garden).toBeNull();
  });

  it('links the game where it is served, the code as the only thing asked', () => {
    expect(gardenLink('http://localhost:5173/?level=4.1&garden=OLD', 'A-b_9')).toBe(
      'http://localhost:5173/?garden=A-b_9',
    );
    // Whatever a code holds, the link carries it safely.
    expect(gardenLink('https://example.org/', 'a b&c')).toBe(
      'https://example.org/?garden=a%20b%26c',
    );
  });

  it('names the file safely: no slash nor odd letter, 40 characters at most', () => {
    expect(gardenFilename('AQRA')).toBe('jardin-AQRA.json');
    const long = gardenFilename(`../${'x'.repeat(100)}/\\:*?`);
    expect(long).toMatch(/^jardin-[A-Za-z0-9_-]+\.json$/);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(gardenFilename('/:*')).toBe('jardin.json');
  });

  it('reads a chosen file only when it fits', () => {
    expect(fileFitsImport(MAX_IMPORT_LENGTH)).toBe(true);
    expect(fileFitsImport(MAX_IMPORT_LENGTH + 1)).toBe(false);
  });

  it("says why a text is no garden, in the garden's words, with the limit it ran into", () => {
    for (const reason of REJECTIONS) {
      const said = importReasonText(reason, t);
      expect({ reason, untold: said === missing(`share.reason.${reason}`) }).toEqual({
        reason,
        untold: false,
      });
      expect(MATHEMATICS.test(said)).toBe(false);
    }
    expect(importReasonText('tooMany', t)).toContain(String(MAX_SPROUTS));
    expect(importReasonText('tooManyVines', t)).toContain(String(MAX_VINES));
  });

  it('has every text it shows, none naming the mathematics', () => {
    for (const key of SHARE_TEXTS) {
      expect({ key, untold: t(key) === missing(key) }).toEqual({ key, untold: false });
      expect(MATHEMATICS.test(t(key))).toBe(false);
    }
  });
});
