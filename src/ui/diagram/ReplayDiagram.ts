import type { Translate } from '@services/i18n';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { ReplayStep } from '@ui/model/diagramReplay';
import type { GardenDiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import { stepText } from '@ui/model/eventText';
import { fitGarden, miniGarden } from '@ui/model/miniGarden';
import { itemAt } from '@core/shared/itemAt';
import { LOOK_ONLY, drawGarden, gardenSvg } from './GardenSvg';
import { part } from './parts';
import { stepControls } from './stepControls';

/**
 * A replayed day, in the intuition tab of an entry (plan 07, phase 4): the garden at one step of
 * the day (`ui/model/diagramReplay.ts`), the sun as a slider from dawn to dusk, buttons a step back
 * and forth and back to dawn, and what has just happened told under the garden. The slider takes
 * the arrow keys itself; the buttons take Enter and Space.
 */

/** What a diagram built on a replayed day adds to it: parts under the controls, kept in step. */
export interface ReplayExtras {
  readonly parts: readonly HTMLElement[];
  /** Called with each step shown, to bring the parts up to it. */
  readonly onShow: (step: number) => void;
}

/** Builds the diagram in `hole`, walking `steps` of a day in `garden`. */
export function replayDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  spec: GardenDiagramSpec,
  steps: readonly ReplayStep[],
  t: Translate,
  extras: ReplayExtras = { parts: [], onShow: () => undefined },
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions);
  const last = steps.length - 1;
  let shown = 0;

  const figure = part(page, 'figure', `dg dg-${spec.kind}`);
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = gardenSvg(page, t('diagram.garden'));
  const controls = stepControls(page, t, 0, last, (k) => show(k));
  const told = part(page, 'p', 'dg-step');
  told.setAttribute('aria-live', 'polite');
  const help = part(
    page,
    'p',
    'dg-help',
    helpKeys(spec)
      .map((key) => t(key))
      .join(' '),
  );
  figure.append(svg, ...controls.rows, ...extras.parts, told, help);
  hole.replaceChildren(figure);

  /** Shows step `k` of the day (kept between dawn and dusk). */
  const show = (k: number): void => {
    shown = Math.min(last, Math.max(0, k));
    const step = itemAt(steps, shown);
    drawGarden(svg, miniGarden(garden, layout, step.moment), { ...LOOK_ONLY, t });
    controls.show(shown, t('diagram.step', { step: shown, count: last }));
    told.textContent = stepText(step.events, garden.names, t);
    extras.onShow(shown);
  };
  show(0);
}
