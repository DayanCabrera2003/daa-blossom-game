import { catalog } from '@levels/catalog';
import { cardDemos } from '@levels/cards/catalog';
import type { Translate } from '@services/i18n';
import { diagramGarden, type DiagramSources } from '@ui/model/diagramGarden';
import { replaySteps } from '@ui/model/diagramReplay';
import { parseDiagramSpec } from '@ui/model/diagramSpec';
import { playDiagram } from './PlayDiagram';
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
  const garden = diagramGarden(spec.value, diagramSources());
  if (!garden.ok) return report(garden.error);
  if (spec.value.kind === 'play') {
    playDiagram(hole, garden.value, spec.value, t);
    return;
  }
  const steps = replaySteps(garden.value, spec.value.trace);
  if (!steps.ok) return report(steps.error);
  replayDiagram(hole, garden.value, spec.value, steps.value, t);
}
