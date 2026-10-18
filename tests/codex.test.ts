import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodeGarden } from '@core/codes/gardenCode';
import { catalog } from '@levels/catalog';
import { CARD_IDS } from '@levels/cards/schema';
import { CODEX_ENTRIES, CODEX_TABS, type CodexEntryId } from '@levels/codex';
import { renderMath } from '@ui/math/renderMath';
import { markdownToHtml } from '@ui/math/markdown';
import { parseCodexEntry, type CodexEntry } from '@ui/model/codexEntry';
import { codexIndex } from '@ui/model/codexIndex';
import { codexStructure, resultId, type CodexStructure } from '@ui/model/codexStructure';
import { mathSpans } from '@ui/model/mathSpans';
import { describe, expect, it } from 'vitest';
import { codexSources, openCodex } from '@services/codexProgress';
import { emptySave, recordCompletion } from '@services/save';
import { MATHEMATICS } from './support/vocabulary';

/**
 * The integrity of the Codex as written (plan 07, phase 3): the fourteen files of
 * `content/es/codex/`, their markers, their formulas, their links and diagrams, the words each tab
 * may use and, entry by entry as the texts are written, the structure of their proofs.
 */

const FOLDER = join(import.meta.dirname, '..', 'src', 'content', 'es', 'codex');

/** The file name of an entry: `C1` is `C01.md`. */
const fileOf = (entry: CodexEntryId): string => `C${entry.slice(1).padStart(2, '0')}.md`;

/** The source of each entry's file. */
const sources = new Map(
  CODEX_ENTRIES.map((entry) => [entry, readFileSync(join(FOLDER, fileOf(entry)), 'utf8')]),
);

/** Each entry as the book reads it; a file that does not parse fails the test that reads it. */
const entries: CodexEntry[] = CODEX_ENTRIES.map((entry) => {
  const parsed = parseCodexEntry(sources.get(entry) ?? '');
  if (!parsed.ok) throw new Error(`${entry}: ${JSON.stringify(parsed.error)}`);
  return parsed.value;
});

/** The structure of each entry's formal tab. */
const structures = new Map<string, CodexStructure>(
  entries.map((entry) => [entry.id, codexStructure(entry.tabs.formal)]),
);

/** Every text of an entry: its titles and its three tabs. */
const textsOf = (entry: CodexEntry): string[] => [
  entry.gardenTitle,
  entry.formalTitle,
  ...CODEX_TABS.map((tab) => entry.tabs[tab]),
];

/**
 * The entries whose texts are written (phases 7–10), so their proofs are held to the structure of
 * rigor. It grows entry by entry, and goes away when it holds all fourteen.
 */
const RIGOR_READY: readonly CodexEntryId[] = [];

/** The only entries where a result may be stated without proof, out of the scope of the book. */
const OUT_OF_SCOPE_ALLOWED: readonly CodexEntryId[] = ['C11', 'C14'];

/** The kinds of result that need a proof. */
const PROVED = new Set(['Lema', 'Proposición', 'Teorema', 'Corolario']);

/** What is wrong with the proofs and numbering of a formal tab, entry `entry` (empty if nothing). */
function rigorProblems(entry: CodexEntryId, formal: string): string[] {
  const number = Number(entry.slice(1));
  return codexStructure(formal).results.flatMap((result, i) => {
    const id = resultId(result);
    const problems: string[] = [];
    if (result.entry !== number || result.number !== i + 1) problems.push(`${id} out of order`);
    const proof = result.proof;
    if (proof === 'outOfScope' && !OUT_OF_SCOPE_ALLOWED.includes(entry)) {
      problems.push(`${id} left out of scope`);
    }
    if (PROVED.has(result.kind) && (proof === 'none' || proof === 'open')) {
      problems.push(`${id} not proved`);
    }
    return problems;
  });
}

describe('the files of the Codex (content/es/codex)', () => {
  it('are exactly C01.md to C14.md, each marked with its own entry', () => {
    expect(readdirSync(FOLDER).sort()).toEqual(CODEX_ENTRIES.map(fileOf).sort());
    expect(entries.map((entry) => entry.id)).toEqual(CODEX_ENTRIES);
  });

  it('each has a garden title, a formal title and three tabs with text', () => {
    for (const entry of entries) {
      expect(textsOf(entry).every((text) => text.trim() !== '')).toBe(true);
    }
  });

  it('no file is longer than 1000 lines, nor is any stylesheet of the books', () => {
    const ui = join(import.meta.dirname, '..', 'src', 'ui');
    const sheets = readdirSync(ui, { recursive: true, withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith('.css'))
      .map((file) => readFileSync(join(file.parentPath, file.name), 'utf8'));
    const long = [...sources.values(), ...sheets].filter((text) => text.split('\n').length > 1000);
    expect(long).toEqual([]);
  });
});

describe('the formulas of the Codex', () => {
  it('every formula of every entry renders with KaTeX, strictly', () => {
    const formulas = entries.flatMap(textsOf).flatMap(mathSpans);
    expect(formulas.some((span) => span.kind === 'math')).toBe(true);
    for (const entry of entries) {
      for (const span of textsOf(entry).flatMap(mathSpans)) {
        if (span.kind === 'math')
          expect(() => renderMath(span.tex, span.display, 'strict')).not.toThrow();
      }
    }
  });

  it('every tab turns into HTML in the strict mode of the books', () => {
    for (const entry of entries) {
      for (const tab of CODEX_TABS) {
        expect(() => markdownToHtml(entry.tabs[tab], 'strict')).not.toThrow();
      }
    }
  });
});

describe('what the Codex points at', () => {
  it('every link goes to an entry that exists and, if it names one, to a result of it', () => {
    for (const entry of entries) {
      for (const link of CODEX_TABS.flatMap((tab) => codexStructure(entry.tabs[tab]).links)) {
        expect(CODEX_ENTRIES).toContain(link.entry);
        if (link.result === null) continue;
        const target = structures.get(link.entry)?.results.map(resultId) ?? [];
        expect(target).toContain(link.result);
      }
    }
  });

  it('every diagram block is JSON, and the level, card or garden code it names exists', () => {
    const levels = new Set(catalog().map((level) => level.data.id));
    for (const entry of entries) {
      for (const text of CODEX_TABS.flatMap((tab) => codexStructure(entry.tabs[tab]).diagrams)) {
        const spec = JSON.parse(text) as { level?: string; card?: string; code?: string };
        if (spec.level !== undefined) expect(levels.has(spec.level)).toBe(true);
        if (spec.card !== undefined) expect(CARD_IDS).toContain(spec.card);
        if (spec.code !== undefined) expect(decodeGarden(spec.code).ok).toBe(true);
      }
    }
  });
});

describe('the words of each tab (GDD §2, principle 2)', () => {
  it('the garden title and the intuition never name the mathematics', () => {
    const offending = entries.filter(
      (entry) => MATHEMATICS.test(entry.gardenTitle) || MATHEMATICS.test(entry.tabs.intuition),
    );
    expect(offending.map((entry) => entry.id)).toEqual([]);
  });

  it('the formal tab of C1 to C12 names its object with the mathematics', () => {
    const silent = entries
      .slice(0, 12)
      .filter((entry) => !MATHEMATICS.test(`${entry.formalTitle}\n${entry.tabs.formal}`));
    expect(silent.map((entry) => entry.id)).toEqual([]);
  });
});

describe('the structure of rigor of the formal tabs', () => {
  it('each formal tab ends with its references, citing LP, KV or T', () => {
    for (const entry of entries) {
      const sections = entry.tabs.formal.split(/^### /m);
      const last = sections.at(-1) ?? '';
      expect({ entry: entry.id, last: last.split('\n')[0] }).toEqual({
        entry: entry.id,
        last: 'Referencias',
      });
      expect(/\b(LP|KV|T)\b/.test(last)).toBe(true);
    }
  });

  it('the entries already written prove every result, numbered in order', () => {
    for (const entry of entries.filter((written) => RIGOR_READY.includes(written.id))) {
      expect({ entry: entry.id, problems: rigorProblems(entry.id, entry.tabs.formal) }).toEqual({
        entry: entry.id,
        problems: [],
      });
    }
  });

  it('the check of rigor catches a missing or open proof, a gap in the numbers and scope', () => {
    const good = [
      '**Definición 3.1.** Algo.',
      '**Lema 3.2.** Algo.',
      '*Demostración.* Así. $\\blacksquare$',
    ].join('\n\n');
    expect(rigorProblems('C3', good)).toEqual([]);
    const bad = [
      '**Lema 3.1.** Sin prueba.',
      '**Teorema 3.3.** Abierta.',
      '*Demostración.* Sin cerrar.',
      '**Observación 4.4 (x).** (sin demostración: fuera de alcance)',
    ].join('\n\n');
    expect(rigorProblems('C3', bad)).toEqual([
      'L3.1 not proved',
      'T3.3 out of order',
      'T3.3 not proved',
      'O4.4 out of order',
      'O4.4 left out of scope',
    ]);
    expect(
      rigorProblems('C11', '**Observación 11.1 (x).** (sin demostración: fuera de alcance)'),
    ).toEqual([]);
  });
});

describe('the index of the Codex, with the real entries', () => {
  it('after 0.5 alone shows C1 by its garden title, never by its formal one', () => {
    const save = recordCompletion(emptySave(), '0.5', 1);
    const open = openCodex(codexSources(catalog()), save, false);
    const index = codexIndex(open, new Set(), new Map(entries.map((entry) => [entry.id, entry])));
    const formal = entries[0]?.formalTitle ?? '';
    expect(index[0]).toMatchObject({ kind: 'open', formalTitle: null });
    expect(JSON.stringify(index)).not.toContain(formal);
    expect(index.slice(1).every((row) => row.kind === 'closed')).toBe(true);
  });
});
