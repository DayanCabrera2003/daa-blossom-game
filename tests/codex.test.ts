import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
import { diagramGarden, type DiagramSources } from '@ui/model/diagramGarden';
import { chartRaces } from '@ui/model/chartPicture';
import { flowerOf } from '@ui/model/cutPlay';
import { replaySteps } from '@ui/model/diagramReplay';
import { reflectionOf } from '@ui/model/pondPicture';
import { recipeDay } from '@ui/model/recipePicture';
import { parseDiagramSpec, type DiagramSpec } from '@ui/model/diagramSpec';
import { TEXT_PARAMS } from '@content/keys';
import { cardDemos } from '@levels/cards/catalog';
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

/** Whether a day was played, from dawn through at least two steps. */
const lastsADay = (day: { ok: boolean; value?: readonly unknown[] }): boolean =>
  day.ok && (day.value?.length ?? 0) > 2;

/** Every diagram block of every tab, with its entry, read as a diagram (or failing the test). */
const diagrams: [CodexEntryId, DiagramSpec][] = entries.flatMap((entry) =>
  CODEX_TABS.flatMap((tab) => codexStructure(entry.tabs[tab]).diagrams).map(
    (block): [CodexEntryId, DiagramSpec] => {
      const spec = parseDiagramSpec(block);
      if (!spec.ok) throw new Error(`${entry.id}: ${spec.error.join('; ')}`);
      return [entry.id, spec.value];
    },
  ),
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
const RIGOR_READY: readonly CodexEntryId[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];

/** The only entries where a result may be stated without proof, out of the scope of the book. */
const OUT_OF_SCOPE_ALLOWED: readonly CodexEntryId[] = ['C11', 'C14'];

/**
 * The eight boxes of the checklist of rigor (plan 07, phases 7–10), ticked in a comment
 * `<!-- rigor: 1 2 3 4 5 6 7 8 -->` at the foot of each written formal tab.
 */
const RIGOR_BOXES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * The entries written but not yet compared line by line with the printed references (box 5): that
 * check is made by hand, against the editions cited, when the milestone of the texts is reviewed.
 */
const AWAITING_BOOKS: readonly CodexEntryId[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'];

/** The boxes ticked in the rigor comment of a formal tab, or null when it has none. */
function rigorBoxes(formal: string): number[] | null {
  const comment = /<!--\s*rigor:([\d\s]*)-->/.exec(formal);
  return comment === null ? null : (comment[1] ?? '').trim().split(/\s+/).map(Number);
}

/** The boxes a written entry must tick: all eight, or all but 5 while it awaits the books. */
const boxesDue = (entry: CodexEntryId): number[] =>
  RIGOR_BOXES.filter((box) => box !== 5 || !AWAITING_BOOKS.includes(entry));

/** The files of the repository a text names in code spans (`src/core/…/x.test.ts`). */
const namedFiles = (text: string): string[] =>
  [...text.matchAll(/`((?:src|tests)\/[\w./-]+\.ts)`/g)].map((match) => match[1] as string);

/** Words that wave a step through instead of justifying it. */
const HAND_WAVING = /obviamente|es f[áa]cil ver|claramente|trivialmente|es evidente/i;

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

  it('every diagram block is a diagram, and the level, card or garden code it names exists', () => {
    const levels = new Set(catalog().map((level) => level.data.id));
    for (const [, spec] of diagrams) {
      if (spec.kind === 'chart') {
        for (const level of spec.races) expect(levels.has(level)).toBe(true);
        continue;
      }
      if (spec.level !== undefined) expect(levels.has(spec.level)).toBe(true);
      if (spec.card !== undefined) expect(CARD_IDS).toContain(spec.card);
      if (spec.code !== undefined) expect(decodeGarden(spec.code).ok).toBe(true);
      for (const key of [spec.title, spec.help]) {
        if (key !== undefined) expect(TEXT_PARAMS).toHaveProperty([key]);
      }
    }
  });
});

describe('the diagrams of the Codex (plan 07, phases 4 and 5)', () => {
  const levels = catalog();
  const cards = cardDemos();
  const sources: DiagramSources = {
    level: (id) => levels.find((level) => level.data.id === id),
    card: (id) => cards.get(id),
  };

  it('every block builds its garden, and every replayed day plays to its end', () => {
    expect(diagrams.length).toBeGreaterThan(0);
    for (const [entry, spec] of diagrams) {
      if (spec.kind === 'chart') {
        const raced = levels.filter((level) => spec.races.includes(level.data.id));
        expect({ entry, races: chartRaces(raced).length > 1 }).toEqual({ entry, races: true });
        continue;
      }
      const garden = diagramGarden(spec, sources);
      expect({ entry, ok: garden.ok }).toEqual({ entry, ok: true });
      if (!garden.ok) continue;
      // What each kind needs of its garden besides the garden itself.
      const needs: Record<string, () => boolean> = {
        replay: () => spec.kind === 'replay' && lastsADay(replaySteps(garden.value, spec.trace)),
        recipe: () => lastsADay(recipeDay(garden.value)),
        pond: () => reflectionOf(garden.value).ok,
        cut: () => flowerOf(garden.value).ok,
      };
      const need = needs[spec.kind];
      if (need !== undefined)
        expect({ entry, kind: spec.kind, ok: need() }).toMatchObject({ ok: true });
    }
  });

  it('draws in the intuition of each entry the garden the plan gives it', () => {
    const drawn = diagrams.map(([entry, spec]) => ({
      entry,
      kind: spec.kind,
      garden: spec.kind === 'chart' ? spec.races.join(' ') : (spec.level ?? spec.card ?? spec.code),
      day: spec.kind === 'replay' ? spec.trace : spec.kind === 'play' ? spec.moves.join(' ') : '',
    }));
    expect(drawn).toEqual([
      { entry: 'C1', kind: 'play', garden: '1.1', day: 'join split' },
      { entry: 'C2', kind: 'play', garden: '1.3', day: 'chain' },
      { entry: 'C3', kind: 'pond', garden: '2.1', day: '' },
      { entry: 'C4', kind: 'replay', garden: '3.4', day: 'solution' },
      { entry: 'C5', kind: 'cover', garden: '3.8', day: '' },
      { entry: 'C6', kind: 'replay', garden: '4.1', day: 'autoSearch' },
      { entry: 'C6', kind: 'replay', garden: '4.2', day: 'autoSearch' },
      { entry: 'C7', kind: 'replay', garden: '4.6', day: 'solution' },
      { entry: 'C8', kind: 'cut', garden: '4.11', day: '' },
      { entry: 'C9', kind: 'replay', garden: '5.1', day: 'edmonds' },
      { entry: 'C10', kind: 'recipe', garden: '6.2', day: '' },
      { entry: 'C11', kind: 'chart', garden: '6.4 6.5', day: '' },
      { entry: 'C12', kind: 'stones', garden: '7.3', day: '' },
      { entry: 'C12', kind: 'stones', garden: '7.4', day: '' },
      { entry: 'C14', kind: 'play', garden: 'AQaMSgA', day: 'join split' },
    ]);
  });

  it('keeps every diagram in the intuition tab, where the garden speaks', () => {
    for (const entry of entries) {
      for (const tab of ['formal', 'bridge'] as const) {
        expect({
          entry: entry.id,
          tab,
          diagrams: codexStructure(entry.tabs[tab]).diagrams,
        }).toEqual({ entry: entry.id, tab, diagrams: [] });
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

  it('the entries already written tick their checklist of rigor in a comment', () => {
    for (const entry of entries.filter((written) => RIGOR_READY.includes(written.id))) {
      expect({ entry: entry.id, boxes: rigorBoxes(entry.tabs.formal) }).toEqual({
        entry: entry.id,
        boxes: boxesDue(entry.id),
      });
    }
  });

  it('the entries already written name their witnesses in the core, and every one exists', () => {
    const root = join(import.meta.dirname, '..');
    for (const entry of entries.filter((written) => RIGOR_READY.includes(written.id))) {
      const files = namedFiles(entry.tabs.formal);
      expect({ entry: entry.id, witness: files.some((file) => file.endsWith('.test.ts')) }).toEqual(
        { entry: entry.id, witness: true },
      );
      const missing = files.filter((file) => !existsSync(join(root, file)));
      expect({ entry: entry.id, missing }).toEqual({ entry: entry.id, missing: [] });
    }
  });

  it('the entries already written never wave a step through', () => {
    const waving = entries.filter(
      (entry) => RIGOR_READY.includes(entry.id) && HAND_WAVING.test(entry.tabs.formal),
    );
    expect(waving.map((entry) => entry.id)).toEqual([]);
  });

  it('the helpers of the checklist read the comment, the witnesses and the waving', () => {
    expect(rigorBoxes('Texto.\n\n<!-- rigor: 1 2 3 -->')).toEqual([1, 2, 3]);
    expect(rigorBoxes('Sin casillas.')).toBeNull();
    expect(boxesDue('C1')).toEqual(
      AWAITING_BOOKS.includes('C1') ? [1, 2, 3, 4, 6, 7, 8] : [...RIGOR_BOXES],
    );
    expect(namedFiles('Testigo: `src/core/a.test.ts` y `tests/support/b.ts`; no `x`.')).toEqual([
      'src/core/a.test.ts',
      'tests/support/b.ts',
    ]);
    expect(HAND_WAVING.test('Es fácil ver que sí.')).toBe(true);
    expect(HAND_WAVING.test('Por el Lema 2.3, sí.')).toBe(false);
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
