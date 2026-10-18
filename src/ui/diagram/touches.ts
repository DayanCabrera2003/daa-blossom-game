import { targetOf, type DiagramTarget } from '@ui/model/diagramTouch';

/**
 * How a small garden of the Codex is touched: a press with the pointer on a sprout or vine that
 * can be touched, or Enter or Space on the one that has the keyboard focus. The garden's diagram
 * is handed what was touched; a press anywhere else does nothing.
 */
export function listenForTouches(
  svg: SVGSVGElement,
  onTouch: (target: DiagramTarget) => void,
): void {
  /** Touches what `element` stands for, if anything. */
  const touch = (element: Element | null): void => {
    const name = element?.closest<SVGElement>('[data-target]')?.dataset['target'];
    const target = name === undefined ? null : targetOf(name);
    if (target !== null) onTouch(target);
  };
  svg.addEventListener('click', (event) => touch(event.target as Element | null));
  svg.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    touch(event.target as Element | null);
  });
}

/** Keeps the keyboard focus on the same sprout or vine while `draw` draws the garden anew. */
export function keepingFocus(svg: SVGSVGElement, draw: () => void): void {
  const active = svg.ownerDocument.activeElement;
  const focused = active instanceof SVGElement ? active.dataset['target'] : undefined;
  draw();
  if (focused !== undefined) svg.querySelector<SVGElement>(`[data-target="${focused}"]`)?.focus();
}
