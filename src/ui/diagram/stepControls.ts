import type { Translate } from '@services/i18n';
import { diagramButton, part } from './parts';

/**
 * The controls that walk a diagram step by step (a replayed day, the races of a chart): the sun as
 * a slider with a button a step back and one forth on the row right under the picture, and where
 * the walk is with the way back to its first step on the next. The slider takes the arrow keys
 * itself; the buttons take Enter and Space.
 */
export interface StepControls {
  /** The two rows of controls, to go right under the picture. */
  readonly rows: readonly HTMLElement[];
  /** Brings the controls to step `k`, saying where the walk is with `where`. */
  show(k: number, where: string): void;
}

/** Controls over the steps `first` to `last`, calling `onStep` with the step asked for. */
export function stepControls(
  page: Document,
  t: Translate,
  first: number,
  last: number,
  onStep: (k: number) => void,
): StepControls {
  let shown = first;
  const go = (k: number): void => onStep(Math.min(last, Math.max(first, k)));
  const bar = part(page, 'div', 'dg-bar dg-bar-sun');
  const back = diagramButton(page, t('diagram.stepBack'), () => go(shown - 1));
  const sun = part(page, 'input', 'dg-sun-slider');
  Object.assign(sun, { type: 'range', min: String(first), max: String(last), step: '1' });
  sun.setAttribute('aria-label', t('diagram.sun'));
  sun.addEventListener('input', () => go(Number(sun.value)));
  const forward = diagramButton(page, t('diagram.stepForward'), () => go(shown + 1));
  bar.append(back, sun, forward);
  const where = part(page, 'div', 'dg-bar');
  const counter = part(page, 'span', 'dg-count');
  const reset = diagramButton(page, t('diagram.reset'), () => go(first));
  where.append(counter, reset);
  return {
    rows: [bar, where],
    show(k, text) {
      shown = k;
      sun.value = String(k);
      counter.textContent = text;
      back.disabled = k === first;
      forward.disabled = k === last;
      reset.disabled = k === first;
    },
  };
}
