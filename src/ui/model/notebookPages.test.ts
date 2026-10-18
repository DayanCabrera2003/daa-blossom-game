import { describe, expect, it } from 'vitest';
import type { CodexEntryId, CodexTab, OpenTabs } from '@levels/codex';
import { catalog } from '@levels/catalog';
import { notebookPages, notebookSources, type NotebookSource } from './notebookPages';

/** Open tabs from plain data. */
const open = (rows: [CodexEntryId, CodexTab[]][]): OpenTabs =>
  new Map(rows.map(([entry, tabs]) => [entry, new Set(tabs)]));

/** A question of a level: its prompt, endings (the right ones marked) and the entry it links to. */
const question = (id: string, entry: CodexEntryId, right: number[]) => ({
  prompt: `${id}.prompt`,
  codex: entry,
  options: [0, 1, 2].map((k) => ({ line: `${id}.ending.${k}`, correct: right.includes(k) })),
});

const LEVELS: NotebookSource[] = [
  { id: '1.5', questions: [question('1.5', 'C2', [0])] },
  { id: '2.4', questions: [question('2.4', 'C3', [1])] },
  { id: '6.6', questions: [question('6.6a', 'C10', [2]), question('6.6b', 'C10', [0, 2])] },
  { id: '0.1', questions: [] },
];

describe('the pages of the notebook as a book', () => {
  it('with nothing written, the book has no page', () => {
    expect(notebookPages(LEVELS, [], open([]))).toEqual([]);
  });

  it('a page per statement written, in the order written, with its start and its right ending', () => {
    const pages = notebookPages(LEVELS, ['2.4', '1.5'], open([]));
    expect(pages.map((page) => page.level)).toEqual(['2.4', '1.5']);
    expect(pages[0]).toMatchObject({
      prompt: '2.4.prompt',
      endings: ['2.4.ending.1'],
      entry: 'C3',
    });
  });

  it('a statement whose entry is still closed is translated later: no link yet', () => {
    expect(notebookPages(LEVELS, ['1.5'], open([['C1', ['intuition']]]))[0]?.link).toBeNull();
  });

  it('links to the formal tab of its entry once open, else to the intuition', () => {
    const formal = open([['C2', ['intuition', 'formal', 'bridge']]]);
    expect(notebookPages(LEVELS, ['1.5'], formal)[0]?.link).toEqual({ entry: 'C2', tab: 'formal' });
    const intuition = open([['C2', ['intuition']]]);
    expect(notebookPages(LEVELS, ['1.5'], intuition)[0]?.link).toEqual({
      entry: 'C2',
      tab: 'intuition',
    });
    const bridge = open([['C2', ['bridge']]]);
    expect(notebookPages(LEVELS, ['1.5'], bridge)[0]?.link).toEqual({ entry: 'C2', tab: 'bridge' });
  });

  it('a level that asks two questions gives two pages, every right ending on each', () => {
    const pages = notebookPages(LEVELS, ['6.6'], open([]));
    expect(pages.map((page) => page.prompt)).toEqual(['6.6a.prompt', '6.6b.prompt']);
    expect(pages[1]?.endings).toEqual(['6.6b.ending.0', '6.6b.ending.2']);
  });

  it('an entry listed with no tab open is no place to link to', () => {
    expect(notebookPages(LEVELS, ['1.5'], open([['C2', []]]))[0]?.link).toBeNull();
  });

  it('reads the questions of the real levels: one in 1.5, two in 6.6, none in 1.1', () => {
    const sources = new Map(notebookSources(catalog()).map((source) => [source.id, source]));
    expect(sources.get('1.5')?.questions).toHaveLength(1);
    expect(sources.get('6.6')?.questions).toHaveLength(2);
    expect(sources.get('1.1')?.questions).toEqual([]);
  });

  it('a level written that the catalog no longer has, or that asks nothing, gives no page', () => {
    expect(notebookPages(LEVELS, ['9.9', '0.1'], open([]))).toEqual([]);
  });
});
