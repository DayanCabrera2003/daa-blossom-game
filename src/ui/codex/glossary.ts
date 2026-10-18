import { unwrap } from '@core/shared/result';
import glossaryEs from '@content/es/codex/glossary.json';
import { parseGlossary, type Glossary } from '@ui/model/glossary';
import type { CodexLocale } from './entries';

/**
 * The glossary of C13 in each language, bundled into the deferred books chunk with the entries
 * (only the books import this module). `tests/codex.test.ts` holds the file to its schema, so a
 * file that does not parse here is a bug and stops the book loudly.
 */

/** The file of the glossary, by language. */
const SOURCES: Readonly<Record<CodexLocale, unknown>> = { es: glossaryEs };

/** The parsed glossary of each language, built on first use. */
const parsed = new Map<CodexLocale, Glossary>();

/** The glossary of the garden and the mathematics in `locale`. */
export function codexGlossary(locale: CodexLocale = 'es'): Glossary {
  let glossary = parsed.get(locale);
  if (glossary === undefined) {
    glossary = unwrap(parseGlossary(SOURCES[locale]));
    parsed.set(locale, glossary);
  }
  return glossary;
}
