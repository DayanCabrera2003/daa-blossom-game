import { describe, expect, it } from 'vitest';
import type { CodexEntryId, CodexTab } from '@levels/codex';
import { glossaryTable, parseGlossary, visibleRows, type Glossary } from './glossary';

const headers = { garden: 'En el jardín', math: 'En matemáticas', entry: 'Página' };

const glossary: Glossary = {
  headers,
  rows: [
    { garden: 'Brote', math: 'Vértice $v\\in V$', entry: 'C1' },
    { garden: 'Cadena', math: 'Camino $M$-aumentante', entry: 'C2' },
    {
      garden: 'Lo que duermen | a oscuras',
      math: '$\\lvert V\\rvert-2\\lvert M\\rvert$',
      entry: 'C12',
    },
  ],
};

/** The tabs open of each entry named, all three. */
const opened = (...entries: CodexEntryId[]): ReadonlyMap<CodexEntryId, ReadonlySet<CodexTab>> =>
  new Map(entries.map((entry) => [entry, new Set<CodexTab>(['intuition', 'formal', 'bridge'])]));

const titles: Partial<Record<CodexEntryId, string>> = {
  C1: 'Un farol para dos',
  C2: 'La cadena',
  C12: 'Las [piedras]',
};
const titleOf = (entry: CodexEntryId): string => titles[entry] ?? entry;

describe('the glossary of C13 (plan 07, phase 10)', () => {
  it('reads the headers and the rows of the file', () => {
    expect(parseGlossary(glossary)).toEqual({ ok: true, value: glossary });
  });

  it('names what is wrong with a file that is not a glossary', () => {
    const parsed = parseGlossary({ headers, rows: [{ garden: '', math: 'x', entry: 'C15' }] });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toEqual([
      expect.stringMatching(/^rows\.0\.garden: /),
      expect.stringMatching(/^rows\.0\.entry: /),
    ]);
    expect(parseGlossary({ headers, rows: [] }).ok).toBe(false);
    expect(parseGlossary({ headers }).ok).toBe(false);
  });

  it('shows only the rows of the entries already open, in the order of the file', () => {
    expect(visibleRows(glossary, opened())).toEqual([]);
    expect(visibleRows(glossary, opened('C2', 'C1')).map((row) => row.garden)).toEqual([
      'Brote',
      'Cadena',
    ]);
  });

  it('a row shows even when only one tab of its entry is open', () => {
    const intuition = new Map([['C1' as const, new Set<CodexTab>(['intuition'])]]);
    expect(visibleRows(glossary, intuition)).toHaveLength(1);
  });

  it('writes the rows shown as a table, each linking to its entry by its garden title', () => {
    expect(glossaryTable(glossary, opened('C1', 'C2'), titleOf)).toBe(
      [
        '| En el jardín | En matemáticas | Página |',
        '|---|---|---|',
        '| Brote | Vértice $v\\in V$ | [Un farol para dos](#C1) |',
        '| Cadena | Camino $M$-aumentante | [La cadena](#C2) |',
        '',
      ].join('\n'),
    );
  });

  it('keeps a bar or a bracket of the text from breaking the table or the link', () => {
    expect(glossaryTable(glossary, opened('C12'), titleOf).split('\n')[2]).toBe(
      '| Lo que duermen \\| a oscuras | $\\lvert V\\rvert-2\\lvert M\\rvert$ | [Las \\[piedras\\]](#C12) |',
    );
  });

  it('writes nothing while no entry with rows is open', () => {
    expect(glossaryTable(glossary, opened('C13'), titleOf)).toBe('');
  });
});
