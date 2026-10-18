import { z } from 'zod';
import { CODEX_ENTRIES, CODEX_TABS, type CodexEntryId, type CodexTab } from '@levels/codex';

/**
 * A page of the Codex: one tab of one entry, the unit the player reads. Tabs of an entry open at
 * different wins (the intuition of C1 at 0.5, the rest at 1.8), so what has been read is kept page
 * by page, and a tab that opens after its entry was read still wears the "new" seal. In the save a
 * page is written `C1:formal`: plain JSON, readable by hand, and checked against the book.
 */

/** A page as the save writes it: the entry and the tab, joined by a colon. */
export type CodexPage = `${CodexEntryId}:${CodexTab}`;

/** The page of `tab` in `entry`. */
export const pageOf = (entry: CodexEntryId, tab: CodexTab): CodexPage => `${entry}:${tab}`;

/** Every page of the book, entry by entry and tab by tab, in the order of the book. */
export const CODEX_PAGES: readonly CodexPage[] = CODEX_ENTRIES.flatMap((entry) =>
  CODEX_TABS.map((tab) => pageOf(entry, tab)),
);

/** A page as the save writes it; anything else is damage. */
export const codexPage = z.enum(CODEX_PAGES as [CodexPage, ...CodexPage[]]);

/** The entry and the tab a page names. */
export function pageParts(page: CodexPage): { entry: CodexEntryId; tab: CodexTab } {
  const [entry, tab] = page.split(':') as [CodexEntryId, CodexTab];
  return { entry, tab };
}
