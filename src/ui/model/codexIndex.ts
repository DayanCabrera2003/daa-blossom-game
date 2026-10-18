import {
  CODEX_ENTRIES,
  CODEX_TABS,
  type CodexEntryId,
  type CodexTab,
  type OpenTabs,
} from '@levels/codex';
import { pageOf, type CodexPage } from '@services/codexPage';

/**
 * The index of the Codex as the player sees it (plan 07, phase 3): every entry in the order of the
 * book; an open one with its garden title, its formal title only once its formal tab is open (the
 * mathematical names are earned, never given away), its open tabs and the "new" seal; a closed one
 * as a closed page with its number and nothing more.
 */

/** The two titles of each entry, as the files of the Codex give them. */
export type EntryTitles = ReadonlyMap<
  CodexEntryId,
  { readonly gardenTitle: string; readonly formalTitle: string }
>;

/** A line of the index. */
export type IndexRow =
  | {
      readonly kind: 'open';
      readonly entry: CodexEntryId;
      readonly number: number;
      readonly gardenTitle: string;
      /** Null while the formal tab is closed. */
      readonly formalTitle: string | null;
      /** The open tabs, in the order of the book. */
      readonly tabs: readonly CodexTab[];
      /** Whether one of its open tabs wears the "new" seal. */
      readonly isNew: boolean;
    }
  | { readonly kind: 'closed'; readonly entry: CodexEntryId; readonly number: number };

/** The index of the book, given what is open, the pages that wear the seal and the titles. */
export function codexIndex(
  open: OpenTabs,
  sealed: ReadonlySet<CodexPage>,
  titles: EntryTitles,
): IndexRow[] {
  return CODEX_ENTRIES.map((entry, i): IndexRow => {
    const number = i + 1;
    const opened = open.get(entry);
    if (opened === undefined) return { kind: 'closed', entry, number };
    const tabs = CODEX_TABS.filter((tab) => opened.has(tab));
    const title = titles.get(entry);
    return {
      kind: 'open',
      entry,
      number,
      gardenTitle: title?.gardenTitle ?? '',
      formalTitle: opened.has('formal') ? (title?.formalTitle ?? '') : null,
      tabs,
      isNew: tabs.some((tab) => sealed.has(pageOf(entry, tab))),
    };
  });
}
