import type { Translate } from '@services/i18n';
import type { DiagramGarden } from '@ui/model/diagramGarden';
import type { ReplayStep } from '@ui/model/diagramReplay';
import type { DiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import { stepText } from '@ui/model/eventText';
import { fitGarden, miniGarden } from '@ui/model/miniGarden';
import { itemAt } from '@core/shared/itemAt';
import { LOOK_ONLY, drawGarden, gardenSvg } from './GardenSvg';
import { diagramButton, part } from './parts';

/**
 * A replayed day, in the intuition tab of an entry (plan 07, phase 4): the garden at one step of
 * the day (`ui/model/diagramReplay.ts`), the sun as a slider from dawn to dusk, buttons a step back
 * and forth and back to dawn, and what has just happened told under the garden. The slider takes
 * the arrow keys itself; the buttons take Enter and Space.
 */

/** The block of a replayed day. */
type ReplaySpec = Extract<DiagramSpec, { kind: 'replay' }>;

/** Builds the diagram in `hole`, walking `steps` of a day in `garden`. */
export function replayDiagram(
  hole: HTMLElement,
  garden: DiagramGarden,
  spec: ReplaySpec,
  steps: readonly ReplayStep[],
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const layout = fitGarden(garden.positions);
  const last = steps.length - 1;
  let shown = 0;

  const figure = part(page, 'figure', 'dg dg-replay');
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = gardenSvg(page, t('diagram.garden'));
  // The sun and its steps on one row right under the garden, where the day is and the way back
  // to dawn on the next.
  const bar = part(page, 'div', 'dg-bar dg-bar-sun');
  const back = diagramButton(page, t('diagram.stepBack'), () => show(shown - 1));
  const sun = part(page, 'input', 'dg-sun-slider');
  Object.assign(sun, { type: 'range', min: '0', max: String(last), step: '1' });
  sun.setAttribute('aria-label', t('diagram.sun'));
  sun.addEventListener('input', () => show(Number(sun.value)));
  const forward = diagramButton(page, t('diagram.stepForward'), () => show(shown + 1));
  const reset = diagramButton(page, t('diagram.reset'), () => show(0));
  const counter = part(page, 'span', 'dg-count');
  bar.append(back, sun, forward);
  const where = part(page, 'div', 'dg-bar');
  where.append(counter, reset);
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
  figure.append(svg, bar, where, told, help);
  hole.replaceChildren(figure);

  /** Shows step `k` of the day (kept between dawn and dusk). */
  const show = (k: number): void => {
    shown = Math.min(last, Math.max(0, k));
    const step = itemAt(steps, shown);
    drawGarden(svg, miniGarden(garden, layout, step.moment), { ...LOOK_ONLY, t });
    sun.value = String(shown);
    counter.textContent = t('diagram.step', { step: shown, count: last });
    told.textContent = stepText(step.events, garden.names, t);
    back.disabled = shown === 0;
    forward.disabled = shown === last;
    reset.disabled = shown === 0;
  };
  show(0);
}
