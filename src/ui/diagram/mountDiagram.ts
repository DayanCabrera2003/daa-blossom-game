import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import type { Translate } from '@services/i18n';
import { diagramGarden, type DiagramSources } from '@ui/model/diagramGarden';
import { replaySteps } from '@ui/model/diagramReplay';
import { parseDiagramSpec } from '@ui/model/diagramSpec';
import { chartRaces } from '@ui/model/chartPicture';
import { reflectionOf } from '@ui/model/pondPicture';
import { recipeDay } from '@ui/model/recipePicture';
import { flowerOf } from '@ui/model/cutPlay';
import { cutDiagram } from './CutDiagram';
import { fitToPage } from './fitToPage';
import { placingDiagram } from './PlacingDiagram';
import { SCARECROWS, STONES } from './placingKinds';
import { chartDiagram } from './ChartDiagram';
import { playDiagram } from './PlayDiagram';
import { recipeDiagram } from './RecipeDiagram';
import { pondDiagram } from './PondDiagram';
import { replayDiagram } from './ReplayDiagram';
import './diagram.css';

/**
 * Fills the hole a `diagram` block leaves in a page of the Codex (`ui/math/markdown.ts`) with its
 * small garden: the block is read, its garden found in the catalog or the cards, and the diagram of
 * its kind built. `tests/codex.test.ts` holds every block of the entries to what exists, so a block
 * that cannot be drawn is a bug: it is reported and its hole stays empty, never breaking the book.
 */

/** The real levels and cards, gathered the first time a diagram asks. */
let sources: DiagramSources | null = null;

/** The real levels, by id, gathered the first time a diagram asks. */
let levels: ReadonlyMap<string, Level> | null = null;

/** The levels of the catalog by id. */
function levelsById(): ReadonlyMap<string, Level> {
  levels ??= new Map(catalog().map((level) => [level.data.id, level]));
  return levels;
}

/** Where the diagrams find their gardens. */
function diagramSources(): DiagramSources {
  if (sources === null) {
    const byId = levelsById();
    const cards = cardDemos();
    sources = { level: (id) => byId.get(id), card: (id) => cards.get(id) };
  }
  return sources;
}

/** Reports a block that cannot be drawn; its hole stays empty. */
function report(problem: unknown): void {
  console.error('a Codex diagram cannot be drawn', problem);
}

/**
 * Draws the diagram the block in `hole` describes, its garden sized so the whole block is seen at
 * once on the page (`fitToPage.ts`).
 */
export function mountDiagram(hole: HTMLElement, t: Translate): void {
  drawDiagram(hole, t);
  const figure = hole.firstElementChild;
  if (figure instanceof HTMLElement) fitToPage(figure);
}

/** Builds the diagram of the block in `hole`, of its kind. */
function drawDiagram(hole: HTMLElement, t: Translate): void {
  const spec = parseDiagramSpec(hole.dataset['diagram'] ?? '');
  if (!spec.ok) return report(spec.error);
  const block = spec.value;
  if (block.kind === 'chart') {
    const races = chartRaces(block.races.flatMap((id) => levelsById().get(id) ?? []));
    if (races.length === 0) return report(`no races in ${block.races.join(', ')}`);
    chartDiagram(hole, races, block, t);
    return;
  }
  const garden = diagramGarden(block, diagramSources());
  if (!garden.ok) return report(garden.error);
  switch (block.kind) {
    case 'play':
      playDiagram(hole, garden.value, block, t);
      return;
    case 'replay': {
      const steps = replaySteps(garden.value, block.trace);
      if (!steps.ok) return report(steps.error);
      replayDiagram(hole, garden.value, block, steps.value, t);
      return;
    }
    case 'pond': {
      const mirror = reflectionOf(garden.value);
      if (!mirror.ok) return report(mirror.error);
      pondDiagram(hole, garden.value, mirror.value, block, t);
      return;
    }
    case 'cover':
      placingDiagram(hole, garden.value, block, SCARECROWS, t);
      return;
    case 'stones':
      placingDiagram(hole, garden.value, block, STONES, t);
      return;
    case 'cut': {
      const flower = flowerOf(garden.value);
      if (!flower.ok) return report(flower.error);
      cutDiagram(hole, garden.value, flower.value, block, t);
      return;
    }
    case 'recipe': {
      const day = recipeDay(garden.value);
      if (!day.ok) return report(day.error);
      recipeDiagram(hole, garden.value, block, day.value, t);
      return;
    }
  }
}
