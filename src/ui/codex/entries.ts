import { unwrap } from '@core/shared/result';
import type { CodexEntryId } from '@levels/codex';
import { parseCodexEntry, type CodexEntry } from '@ui/model/codexEntry';

/**
 * The texts of the Codex entries, bundled into the deferred books chunk (only the books import this
 * module) and split by their markers. The entries are kept by language; only Spanish is written.
 */

/** The languages the Codex is written in. */
export type CodexLocale = 'es';

/** The source of every entry file, by language. */
const SOURCES: Readonly<Record<CodexLocale, Record<string, string>>> = {
  es: import.meta.glob<string>('@content/es/codex/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

/** The parsed entries of each language, built on first use. */
const parsed = new Map<CodexLocale, ReadonlyMap<CodexEntryId, CodexEntry>>();

/**
 * Every entry of the Codex in `locale`, by id. `tests/codex.test.ts` holds every file to its
 * format, so a file that does not parse here is a bug and stops the book loudly.
 */
export function codexEntries(locale: CodexLocale = 'es'): ReadonlyMap<CodexEntryId, CodexEntry> {
  let entries = parsed.get(locale);
  if (entries === undefined) {
    const list = Object.values(SOURCES[locale]).map((source) => unwrap(parseCodexEntry(source)));
    entries = new Map(list.map((entry) => [entry.id, entry]));
    parsed.set(locale, entries);
  }
  return entries;
}
