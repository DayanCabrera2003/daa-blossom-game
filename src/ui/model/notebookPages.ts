import { CODEX_TABS, type CodexEntryId, type CodexTab, type OpenTabs } from '@levels/codex';
import type { Level } from '@levels/build';
import type { NotebookData } from '@levels/notebook';

/**
 * The Cuaderno as a book (GDD §5.5; plan 07, phase 6): a page per statement the player wrote, in
 * the order written, each with the start of the statement and its right ending (dialogue line ids,
 * so the book says exactly what the player chose), the level where it was written and the entry
 * of the Codex that translates it. The link to that entry is offered only once it is open, at its
 * formal tab when that is open too, else at the intuition; until then the page says the statement
 * will be translated later. A level that asks two questions (6.6) is written once and gives two
 * pages: both are answered before the level is won.
 */

/** What the book reads of a level: its id and its notebook questions (none for most levels). */
export interface NotebookSource {
  readonly id: string;
  readonly questions: readonly Pick<NotebookData, 'prompt' | 'codex' | 'options'>[];
}

/** The levels of the catalog as the notebook book reads them. */
export function notebookSources(levels: readonly Level[]): NotebookSource[] {
  return levels.map((level) => ({ id: level.data.id, questions: level.data.notebook ?? [] }));
}

/** A page of the notebook. */
export interface NotebookPage {
  /** The level where the statement was written. */
  readonly level: string;
  /** The line of the start of the statement. */
  readonly prompt: string;
  /** The lines of its right endings (one, in every question written so far). */
  readonly endings: readonly string[];
  /** The entry of the Codex that translates it. */
  readonly entry: CodexEntryId;
  /** Where its link opens the Codex, or null while that entry is closed. */
  readonly link: { readonly entry: CodexEntryId; readonly tab: CodexTab } | null;
}

/** The tab a link to `entry` opens: the formal one when open, else the intuition, else the first. */
function linkTab(open: OpenTabs, entry: CodexEntryId): CodexTab | null {
  const tabs = open.get(entry);
  if (tabs === undefined) return null;
  const preferred: readonly CodexTab[] = ['formal', 'intuition', ...CODEX_TABS];
  return preferred.find((tab) => tabs.has(tab)) ?? null;
}

/** The pages of the notebook for the levels `written` (in the order written), given what is open. */
export function notebookPages(
  sources: readonly NotebookSource[],
  written: readonly string[],
  open: OpenTabs,
): NotebookPage[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  return written.flatMap((level) =>
    (byId.get(level)?.questions ?? []).map((question): NotebookPage => {
      const tab = linkTab(open, question.codex);
      return {
        level,
        prompt: question.prompt,
        endings: question.options.filter((option) => option.correct).map((option) => option.line),
        entry: question.codex,
        link: tab === null ? null : { entry: question.codex, tab },
      };
    }),
  );
}
