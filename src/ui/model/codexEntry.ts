import { itemAt } from '@core/shared/itemAt';
import { err, ok, type Result } from '@core/shared/result';
import { CODEX_ENTRIES, CODEX_TABS, type CodexEntryId, type CodexTab } from '@levels/codex';

/**
 * One file of the Codex (`content/<locale>/codex/C01.md`, plan 07 §1.1) split by its markers: the
 * entry marker, the garden title, then the three tabs in the order of the book, the formal one
 * opening with the formal title. The markers are HTML comments, invisible when the Markdown is read
 * on its own and the same in every language.
 */

/** An entry as the book reads it: its id, its two titles and the Markdown of each tab. */
export interface CodexEntry {
  readonly id: CodexEntryId;
  /** The title in the garden's words, shown whenever the entry is open (`# …`). */
  readonly gardenTitle: string;
  /** The mathematical title, shown only while the formal tab is open (`## …` opening it). */
  readonly formalTitle: string;
  /** The Markdown of each tab, without its marker (nor, in the formal tab, the formal title). */
  readonly tabs: Readonly<Record<CodexTab, string>>;
}

/** What can be wrong with a file of the Codex, so the content tests can say what to fix. */
export type CodexEntryError =
  | { readonly kind: 'noEntry' }
  | { readonly kind: 'extraEntry' }
  | { readonly kind: 'unknownEntry'; readonly entry: string }
  | { readonly kind: 'noGardenTitle' }
  | { readonly kind: 'unknownTab'; readonly tab: string }
  | { readonly kind: 'repeatedTab'; readonly tab: CodexTab }
  | { readonly kind: 'missingTab'; readonly tab: CodexTab }
  | { readonly kind: 'tabsOutOfOrder' }
  | { readonly kind: 'emptyTab'; readonly tab: CodexTab }
  | { readonly kind: 'noFormalTitle' };

/** A marker on a line of its own: `<!-- entry: C3 -->` or `<!-- tab: formal -->`. */
const MARKER = /^[ \t]*<!--\s*(entry|tab)\s*:\s*(\S*?)\s*-->[ \t]*$/gm;

/** A title of the given level (`#` or `##`) alone on the first line of a text. */
const title = (text: string, hashes: string): RegExpExecArray | null =>
  new RegExp(`^${hashes} +(\\S.*)$`, 'm').exec(text);

/** A marker found in the file, with where its line starts and ends. */
interface Marker {
  readonly kind: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

/** Whether `value` names an entry of the book. */
const isEntry = (value: string): value is CodexEntryId =>
  (CODEX_ENTRIES as readonly string[]).includes(value);

/** Whether `value` names a tab. */
const isTab = (value: string): value is CodexTab =>
  (CODEX_TABS as readonly string[]).includes(value);

/** Splits a file of the Codex by its markers, or names the first thing wrong with it. */
export function parseCodexEntry(source: string): Result<CodexEntry, CodexEntryError> {
  const text = source.replaceAll('\r\n', '\n');
  const markers: Marker[] = [...text.matchAll(MARKER)].map((match) => ({
    kind: match[1] as string,
    value: match[2] as string,
    start: match.index,
    end: match.index + match[0].length,
  }));
  const [head, ...rest] = markers;
  if (head?.kind !== 'entry' || text.slice(0, head.start).trim() !== '') {
    return err({ kind: 'noEntry' });
  }
  if (rest.some((marker) => marker.kind === 'entry')) return err({ kind: 'extraEntry' });
  if (!isEntry(head.value)) return err({ kind: 'unknownEntry', entry: head.value });
  // The text after a marker, up to the next one.
  const body = (i: number): string =>
    text.slice(itemAt(markers, i).end, markers[i + 1]?.start ?? text.length).trim();
  const garden = title(body(0), '#');
  if (garden === null || garden[0] !== body(0)) return err({ kind: 'noGardenTitle' });

  const order: CodexTab[] = [];
  const tabs: Partial<Record<CodexTab, string>> = {};
  for (const [i, marker] of rest.entries()) {
    if (!isTab(marker.value)) return err({ kind: 'unknownTab', tab: marker.value });
    if (marker.value in tabs) return err({ kind: 'repeatedTab', tab: marker.value });
    order.push(marker.value);
    tabs[marker.value] = body(i + 1);
  }
  const missing = CODEX_TABS.find((tab) => tabs[tab] === undefined);
  if (missing !== undefined) return err({ kind: 'missingTab', tab: missing });
  if (order.some((tab, i) => tab !== CODEX_TABS[i])) return err({ kind: 'tabsOutOfOrder' });

  // Every tab is there by now, each once.
  const found = tabs as Record<CodexTab, string>;
  const empty = CODEX_TABS.find((tab) => found[tab] === '');
  if (empty !== undefined) return err({ kind: 'emptyTab', tab: empty });
  const formalTitle = title(found.formal, '##');
  if (formalTitle?.index !== 0) return err({ kind: 'noFormalTitle' });
  const formal = found.formal.slice(formalTitle[0].length).trim();
  if (formal === '') return err({ kind: 'emptyTab', tab: 'formal' });
  return ok({
    id: head.value,
    gardenTitle: (garden[1] as string).trim(),
    formalTitle: (formalTitle[1] as string).trim(),
    tabs: { ...found, formal },
  });
}
