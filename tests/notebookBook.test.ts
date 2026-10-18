import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { catalog } from '@levels/catalog';
import { codexSources, openCodex } from '@services/codexProgress';
import { emptySave, recordCompletion, recordNotebook, type SaveData } from '@services/save';
import { notebookPages, notebookSources } from '@ui/model/notebookPages';
import { describe, expect, it } from 'vitest';
import { MATHEMATICS } from './support/vocabulary';

/**
 * The Cuaderno as a book on the real levels and lines (plan 07, phase 6): what a progress writes in
 * it, where each statement links in the Codex, and that it speaks with the garden's words.
 */

const levels = catalog();
const sources = notebookSources(levels);
const codex = codexSources(levels);
const LINES: Readonly<Record<string, string>> = lines;

/** A progress that won `won` and wrote the statements of `written`, in that order. */
function progress(won: readonly string[], written: readonly string[]): SaveData {
  const winning = won.reduce((save, id) => recordCompletion(save, id, 3), emptySave());
  return written.reduce((save, id) => recordNotebook(save, id), winning);
}

/** The pages of the notebook for a progress, outside teacher mode. */
const pagesOf = (save: SaveData) =>
  notebookPages(sources, save.notebook, openCodex(codex, save, false));

describe('the notebook book on the real levels', () => {
  it('with nothing written, it has no page', () => {
    expect(pagesOf(emptySave())).toEqual([]);
  });

  it('the statement of 1.5, written before 1.8 is won, waits for its translation', () => {
    const [page] = pagesOf(progress(['0.5', '1.5'], ['1.5']));
    expect(page).toMatchObject({ level: '1.5', entry: 'C2', link: null });
  });

  it('once 1.8 is won, it links to the formal tab of C2', () => {
    const [page] = pagesOf(progress(['0.5', '1.5', '1.8'], ['1.5']));
    expect(page?.link).toEqual({ entry: 'C2', tab: 'formal' });
  });

  it('6.6, written once, gives its two statements', () => {
    const pages = pagesOf(progress(['6.6'], ['6.6']));
    expect(pages).toHaveLength(2);
    expect(pages.every((page) => page.entry === 'C10')).toBe(true);
  });

  it('the words shown are exactly the lines of the right endings, each of them written', () => {
    const written = levels.filter((level) => level.data.notebook !== undefined);
    const pages = pagesOf(
      progress(
        [],
        written.map((level) => level.data.id),
      ),
    );
    const questions = written.flatMap((level) => level.data.notebook ?? []);
    expect(pages.map((page) => page.endings)).toEqual(
      questions.map((question) =>
        question.options.filter((option) => option.correct).map((option) => option.line),
      ),
    );
    for (const page of pages) {
      for (const id of [page.prompt, ...page.endings]) expect(LINES[id], id).toBeTruthy();
    }
  });

  it('no page uses the vocabulary of the Codex', () => {
    const written = levels.filter((level) => level.data.notebook !== undefined);
    const pages = pagesOf(
      progress(
        [],
        written.map((level) => level.data.id),
      ),
    );
    const texts = [
      ...pages.flatMap((page) => [page.prompt, ...page.endings].map((id) => LINES[id] ?? '')),
      ...Object.entries(strings)
        .filter(([key]) => key.startsWith('notebook.') || key === 'hub.notebook')
        .map(([, text]) => text),
    ];
    for (const text of texts) expect(text).not.toMatch(MATHEMATICS);
  });
});
