import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import { CODEX_ENTRIES, type CodexEntryId } from '@levels/codex';
import { BOOK, introHeight, pageArea, type Size } from '@ui/model/bookLayout';
import { CHART_SIZE } from '@ui/model/chartPicture';
import { parseCodexEntry } from '@ui/model/codexEntry';
import { gardenFit, MIN_GARDEN_HEIGHT } from '@ui/model/diagramFit';
import { diagramGarden, type DiagramSources } from '@ui/model/diagramGarden';
import { parseDiagramSpec, type DiagramKind, type DiagramSpec } from '@ui/model/diagramSpec';
import { fitGarden, MINI } from '@ui/model/miniGarden';
import { describe, expect, it } from 'vitest';

/**
 * Every diagram of the Codex is seen whole on its page at the window the author reads the book at,
 * 1440 x 810 (zoom 3, the logical 480 x 270 of the canvas): the garden with all its controls and its
 * message lines, at once, and on most entries as soon as the page opens, under the text above it.
 * The page's room is the book's (`ui/model/bookLayout.ts`); what each kind of diagram keeps under
 * its garden is counted below in rows of buttons and lines of text, as its builder lays them out
 * (`ui/diagram/`); in the book those are measured (`fitToPage.ts`) and this is their budget.
 */

const FOLDER = join(import.meta.dirname, '..', 'src', 'content', 'es', 'codex');

/** The window of the review, in logical pixels: 1440 x 810 at zoom 3. */
const WINDOW: Size = { width: 1440 / 3, height: 810 / 3 };
const PAGE = pageArea(WINDOW);

/** The gap between the parts of a diagram (diagram.css, `.dg`). */
const PART_GAP = 2;
/** Above a diagram, inside the text: the margin of its hole (diagram.css, `.codex-diagram`). */
const HOLE_MARGIN = 4;

/**
 * What each kind keeps in sight under its garden: rows of wooden buttons, lines of text (the step
 * told, the counts, the refusal), and extra pixels (the frame of the card of C10).
 */
const KEPT: Record<DiagramKind, { rows: number; lines: number; extra?: number }> = {
  // The lantern count and its buttons; the reason of a refusal.
  play: { rows: 1, lines: 1 },
  // The sun with its steps, where the day is; what has just happened.
  replay: { rows: 2, lines: 2 },
  // The four views on two rows; the count and the threads and loops.
  pond: { rows: 2, lines: 3 },
  // The buttons (two rows on a narrow page); the count and what it proves.
  cover: { rows: 2, lines: 4 },
  stones: { rows: 2, lines: 4 },
  // The buttons; the argument of the flower lemma.
  cut: { rows: 1, lines: 5 },
  // A replayed day, and the card the gardener follows in its frame.
  recipe: { rows: 2, lines: 4, extra: 4 + PART_GAP },
  // The sun walking the races, which race; what it says of the last race.
  chart: { rows: 2, lines: 2 },
};

/** The height kept under the garden of a diagram of `kind`, in logical pixels. */
function keptHeight(kind: DiagramKind): number {
  const { rows, lines, extra = 0 } = KEPT[kind];
  return rows * (BOOK.buttonRow + PART_GAP) + lines * BOOK.line + PART_GAP + extra;
}

/** Where the gardens of the diagrams come from. */
const levels = new Map(catalog().map((level) => [level.data.id, level]));
const cards = cardDemos();
const sources: DiagramSources = { level: (id) => levels.get(id), card: (id) => cards.get(id) };

/** The picture of a diagram's garden (or of each of a pair), in its own pixels. */
function pictureOf(spec: DiagramSpec): Size {
  if (spec.kind === 'chart') return CHART_SIZE;
  const garden = diagramGarden(spec, sources);
  if (!garden.ok) throw new Error(JSON.stringify(garden.error));
  return fitGarden(garden.value.positions, spec.kind === 'cut' ? MINI.width / 2 : MINI.width);
}

/** The paragraphs of Markdown before the first diagram block, as plain text. */
function paragraphsBefore(markdown: string): string[] {
  const before = markdown.split('```diagram')[0] ?? '';
  return before
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** A diagram of an entry: its block, and how far down its page it starts (the first one only). */
interface PlacedDiagram {
  readonly entry: CodexEntryId;
  readonly spec: DiagramSpec;
  readonly top: number | null;
}

const placed: PlacedDiagram[] = CODEX_ENTRIES.flatMap((entry) => {
  const file = `C${entry.slice(1).padStart(2, '0')}.md`;
  const parsed = parseCodexEntry(readFileSync(join(FOLDER, file), 'utf8'));
  if (!parsed.ok) throw new Error(`${entry}: ${JSON.stringify(parsed.error)}`);
  const intuition = parsed.value.tabs.intuition;
  const blocks = [...intuition.matchAll(/```diagram\n([\s\S]*?)\n```/g)];
  return blocks.map((block, i): PlacedDiagram => {
    const spec = parseDiagramSpec(block[1] as string);
    if (!spec.ok) throw new Error(`${entry}: ${spec.error.join('; ')}`);
    const top = i === 0 ? introHeight(paragraphsBefore(intuition), PAGE.width) + HOLE_MARGIN : null;
    return { entry, spec: spec.value, top };
  });
});

/** How a diagram's garden is drawn at the review's window, starting `top` down its page. */
function fitOf(diagram: PlacedDiagram, top: number) {
  const kept = keptHeight(diagram.spec.kind);
  const fit = gardenFit({
    page: PAGE,
    top,
    kept,
    picture: pictureOf(diagram.spec),
    unit: 1,
    columns: diagram.spec.kind === 'cut' ? 2 : 1,
    gap: 2,
  });
  return { ...fit, kept };
}

describe('the diagrams of the Codex on their page, at 1440 x 810', () => {
  it('every entry with a diagram is checked: C1 to C12 and C14', () => {
    const withDiagrams = [...new Set(placed.map((diagram) => diagram.entry))];
    expect(withDiagrams).toEqual(CODEX_ENTRIES.filter((entry) => entry !== 'C13'));
  });

  it.each(placed.map((diagram) => [diagram.entry, diagram.spec.kind, diagram] as const))(
    '%s (%s): the garden with all its controls is seen whole, and still read',
    (_entry, _kind, diagram) => {
      const fit = fitOf(diagram, 0);
      const picture = pictureOf(diagram.spec);
      expect(fit.height + fit.kept).toBeLessThanOrEqual(PAGE.height);
      // Not shrunk below the smallest garden read, unless its own picture is smaller still.
      expect(fit.height).toBeGreaterThanOrEqual(
        Math.min(MIN_GARDEN_HEIGHT, Math.floor((picture.height * fit.width) / picture.width)),
      );
    },
  );

  it('on most entries the whole first diagram is seen as the page opens, below the text above it', () => {
    const first = placed.filter((diagram) => diagram.top !== null);
    const atOpen = first.filter((diagram) => fitOf(diagram, diagram.top ?? 0).atOpen);
    expect(atOpen.length).toBeGreaterThan(first.length / 2);
  });
});
