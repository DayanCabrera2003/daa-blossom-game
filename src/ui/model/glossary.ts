import { z } from 'zod';
import { err, ok, type Result } from '@core/shared/result';
import { codexEntry, type CodexEntryId, type OpenTabs } from '@levels/codex';

/**
 * The glossary of the garden and the mathematics (GDD §3.3; plan 07, phase 10): the table the
 * bridge of C13 shows, one row per word of the garden with its mathematical name and the entry
 * that defines it. It grows with the book: a row shows once its entry is open (any tab of it, as
 * the "new" seal of the glossary counts them in `services/codexProgress.ts`). The text lives in
 * `content/<locale>/codex/glossary.json`; this module reads it and writes the table as Markdown,
 * so its formulas and links render like those of any page.
 */

/** A word of the garden, its mathematical name (Markdown, formulas in `$…$`) and its entry. */
const glossaryRow = z.strictObject({
  garden: z.string().min(1),
  math: z.string().min(1),
  entry: codexEntry,
});

/** The file: the three column headers and the rows, in the order of the book. */
const glossarySchema = z.strictObject({
  headers: z.strictObject({
    garden: z.string().min(1),
    math: z.string().min(1),
    entry: z.string().min(1),
  }),
  rows: z.array(glossaryRow).min(1),
});

/** The glossary, read. */
export type Glossary = z.infer<typeof glossarySchema>;

/** One row of the glossary. */
export type GlossaryRow = Glossary['rows'][number];

/** The glossary in `data` (the parsed JSON file), or its issues as `path: message` lines. */
export function parseGlossary(data: unknown): Result<Glossary, readonly string[]> {
  const parsed = glossarySchema.safeParse(data);
  if (parsed.success) return ok(parsed.data);
  return err(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
}

/** The rows whose entries are open, in the order of the file. */
export const visibleRows = (glossary: Glossary, open: OpenTabs): GlossaryRow[] =>
  glossary.rows.filter((row) => open.has(row.entry));

/** A cell of a Markdown table: a bar would end the cell, so it is escaped. */
const cell = (text: string): string => text.replaceAll('|', '\\|');

/** The text of a link: brackets would end it, so they are escaped. */
const linkText = (text: string): string => text.replace(/[[\]]/g, (bracket) => `\\${bracket}`);

/**
 * The rows shown with the entries `open`, as a Markdown table whose last column links each row to
 * its entry by the entry's garden title (`titleOf`). Empty when no row shows: the page then keeps
 * only its own text.
 */
export function glossaryTable(
  glossary: Glossary,
  open: OpenTabs,
  titleOf: (entry: CodexEntryId) => string,
): string {
  const rows = visibleRows(glossary, open);
  if (rows.length === 0) return '';
  const { headers } = glossary;
  const line = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`;
  return [
    line([headers.garden, headers.math, headers.entry].map(cell)),
    '|---|---|---|',
    ...rows.map((row) =>
      line([
        cell(row.garden),
        cell(row.math),
        `[${cell(linkText(titleOf(row.entry)))}](#${row.entry})`,
      ]),
    ),
    '',
  ].join('\n');
}
