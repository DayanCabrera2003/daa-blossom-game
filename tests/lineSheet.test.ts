import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import { lineSheet, PAGE_TEXT_PREFIXES } from '../tools/review/lineSheet';

// The review sheet of the Spanish lines (plan 09, phase 11): every dialogue line once, with a box,
// its speaker and where its sentence comes from; the page's texts after them; and the sheet in
// docs/review/ is the one the sources give today.

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const gdd = read('../docs/GDD.md');
const sheet = lineSheet({ lines, strings, gdd });
const rows = sheet.split('\n').filter((row) => row.startsWith('- [ ] '));

/** The id a row lists. */
const idOf = (row: string): string => /`([^`]+)`/.exec(row)?.[1] ?? '';

describe('the review sheet of the Spanish lines', () => {
  it('lists every dialogue line once, with its text', () => {
    const listed = rows.map(idOf).filter((id) => id in lines);
    expect([...listed].sort()).toEqual(Object.keys(lines).sort());
    for (const [id, text] of Object.entries(lines)) {
      expect(rows.find((row) => idOf(row) === id)).toContain(text);
    }
  });

  it('lists the lines level by level, in the order of the game', () => {
    const levels = sheet
      .split('\n')
      .filter((row) => row.startsWith('### '))
      .map((row) => row.slice(4));
    expect(levels.slice(0, 3)).toEqual(['0.1', '0.2', '0.3']);
    expect(levels.indexOf('1.9')).toBeLessThan(levels.indexOf('1.10'));
    expect(new Set(levels).size).toBe(levels.length);
  });

  it('names who says each line and tells a sentence of the GDD from one a plan wrote', () => {
    const row = rows.find((candidate) => idOf(candidate) === 'ch6.3.bruto.09');
    expect(row).toContain(`**${strings['speaker.bruto']}**`);
    const fromGdd = Object.entries(lines).find(([, text]) => gdd.includes(text));
    expect(fromGdd).toBeDefined();
    expect(rows.find((candidate) => idOf(candidate) === fromGdd?.[0])).toContain('· GDD:');
    expect(rows.some((candidate) => candidate.includes('· plan:'))).toBe(true);
  });

  it('lists the texts of the page and its notices for the author to review', () => {
    const keys = Object.keys(strings).filter((key) =>
      PAGE_TEXT_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'notice.turnPhone',
        'page.description',
        'page.noscript',
        'page.notFound.title',
      ]),
    );
    for (const key of keys) expect(rows.filter((row) => idOf(row) === key)).toHaveLength(1);
  });

  it('is up to date in docs/review/lineas.md (npm run lines writes it)', () => {
    expect(read('../docs/review/lineas.md')).toBe(sheet);
  });
});
