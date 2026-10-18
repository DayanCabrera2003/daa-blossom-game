import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CODEX_ENTRIES } from '@levels/codex';
import { parseCodexEntry } from '@ui/model/codexEntry';
import { codexStructure } from '@ui/model/codexStructure';
import { describe, expect, it } from 'vitest';

/**
 * The rigor-review sheet (plan 07, phase 14; GDD §10), `docs/codex-review.md`, follows the Codex as
 * written: every result proved in a formal tab has its own section on the sheet, with a box per
 * step of its proof, and the sheet names no result the Codex does not prove. So a reviewer who
 * works through the sheet has worked through every proof of the book.
 */

const ROOT = join(import.meta.dirname, '..');
const sheet = readFileSync(join(ROOT, 'docs', 'codex-review.md'), 'utf8');

/** The proved results of the Codex, as the sheet titles them: `Lema 2.3`. */
const proved = CODEX_ENTRIES.flatMap((entry) => {
  const file = `C${entry.slice(1).padStart(2, '0')}.md`;
  const source = readFileSync(join(ROOT, 'src', 'content', 'es', 'codex', file), 'utf8');
  const parsed = parseCodexEntry(source);
  if (!parsed.ok) throw new Error(`${entry} does not parse`);
  return codexStructure(parsed.value.tabs.formal)
    .results.filter((result) => result.proof === 'closed')
    .map((result) => `${result.kind} ${result.entry}.${result.number}`);
});

/** The results the sheet has a section for: its `#### Lema 2.3 (…)` headings. */
const reviewed = [...sheet.matchAll(/^#### (\p{L}+ \d+\.\d+)\b/gmu)].map((match) => match[1]);

describe('the rigor-review sheet of the Codex', () => {
  it('has a section for every proved result, in the order of the book', () => {
    expect(reviewed).toEqual(proved);
  });

  it('gives every proved result at least one box to tick for its proof', () => {
    const sections = sheet.split(/^#### /m).slice(1);
    const empty = sections.filter((section) => !/^- \[ \] /m.test(section));
    expect(empty.map((section) => section.split('\n')[0])).toEqual([]);
  });
});
