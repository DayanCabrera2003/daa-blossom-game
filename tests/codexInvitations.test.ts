import lines from '@content/es/lines.json';
import { catalog } from '@levels/catalog';
import { openedBy } from '@levels/codex';
import { codexEntries } from '@ui/codex/entries';
import { describe, expect, it } from 'vitest';

/**
 * The invitation to the Codex at the end of each chapter (plan 10, phase 11, answer 6; GDD §5.6):
 * in the closing words of the last regular level of a chapter (never a secret garden), Sauce says
 * a short line that names, by their garden titles, pages of the Codex that the chapter opened. It
 * may come just before the chapter's last image (7.5 ends at dawn).
 */

const TABLE: Readonly<Record<string, string>> = lines;

/** The chapter of a level id: `4.12` is in chapter 4. */
const chapterOf = (id: string): string => id.split('.')[0] ?? '';

const levels = catalog();
const chapters = [...new Set(levels.map((level) => chapterOf(level.data.id)))];

/** The garden titles of the pages the levels of `chapter` open. */
function titlesOpenedIn(chapter: string): string[] {
  const unlocks = levels
    .filter((level) => chapterOf(level.data.id) === chapter)
    .flatMap((level) => level.data.unlocks.codex);
  const entries = codexEntries();
  return [...openedBy(unlocks).keys()].map((id) => entries.get(id)?.gardenTitle ?? id);
}

/** The titles a text quotes between «…». */
const quotedIn = (text: string): string[] =>
  [...text.matchAll(/«([^«»]+)»/g)].map((m) => m[1] ?? '');

/** Every line said in a `say` step of a level's script, by id. */
const saidIn = (id: string): string[] =>
  (levels.find((level) => level.data.id === id)?.data.flow ?? []).flatMap((step) =>
    step.step === 'say' ? step.lines : [],
  );

describe('the invitation to the Codex at the end of each chapter', () => {
  it.each(chapters)('chapter %s ends with Sauce naming a page it opened', (chapter) => {
    const regular = levels.filter(
      (level) => chapterOf(level.data.id) === chapter && level.data.secret === undefined,
    );
    const last = regular.at(-1);
    if (last === undefined) throw new Error(`chapter ${chapter} has no levels`);
    const opened = titlesOpenedIn(chapter);
    expect(opened.length).toBeGreaterThan(0);

    const closing = last.data.flow.at(-1);
    expect(closing?.step).toBe('say');
    const words = closing?.step === 'say' ? closing.lines.slice(-2) : [];
    const invitation = words.find((line) => /Códex/.test(TABLE[line] ?? '')) ?? '';
    expect(invitation).toMatch(new RegExp(`^ch${last.data.id.replace('.', '\\.')}\\.sauce\\.`));

    const text = TABLE[invitation] ?? '';
    expect(text).toMatch(/Códex/);
    const titles = quotedIn(text);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.filter((title) => !opened.includes(title))).toEqual([]);
  });

  it('no other line of a script invites to the Codex: one invitation per chapter', () => {
    const inviting = levels
      .flatMap((level) => saidIn(level.data.id))
      .filter((line) => /Códex/.test(TABLE[line] ?? ''));
    expect(inviting).toHaveLength(chapters.length);
  });
});
