import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import type { Translate } from '@services/i18n';
import { diagramGarden, type DiagramSources } from '@ui/model/diagramGarden';
import { replaySteps } from '@ui/model/diagramReplay';
import { parseDiagramSpec } from '@ui/model/diagramSpec';
import { reflectionOf } from '@ui/model/pondPicture';
import { flowerOf } from '@ui/model/cutPlay';
import { coverDiagram } from './CoverDiagram';
import { cutDiagram } from './CutDiagram';
import { playDiagram } from './PlayDiagram';
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

/** Where the diagrams find their gardens. */
function diagramSources(): DiagramSources {
  if (sources === null) {
    const levels = new Map(catalog().map((level) => [level.data.id, level]));
    const cards = cardDemos();
    sources = { level: (id) => levels.get(id), card: (id) => cards.get(id) };
  }
  return sources;
}

/** Reports a block that cannot be drawn; its hole stays empty. */
function report(problem: unknown): void {
  console.error('a Codex diagram cannot be drawn', problem);
}

/** Draws the diagram the block in `hole` describes. */
export function mountDiagram(hole: HTMLElement, t: Translate): void {
  const spec = parseDiagramSpec(hole.dataset['diagram'] ?? '');
  if (!spec.ok) return report(spec.error);
  const block = spec.value;
  if (block.kind === 'chart') return report(`no chart is drawn yet: ${block.races.join(', ')}`);
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
      coverDiagram(hole, garden.value, block, t);
      return;
    case 'cut': {
      const flower = flowerOf(garden.value);
      if (!flower.ok) return report(flower.error);
      cutDiagram(hole, garden.value, flower.value, block, t);
      return;
    }
    default:
      report(`no ${block.kind} diagram is drawn yet`);
  }
}
