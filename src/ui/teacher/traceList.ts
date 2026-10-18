import { panelKey } from '@ui/model/teacherPanel';
import { renderMath } from '../math/renderMath';
import { part } from '../diagram/parts';

/**
 * A trace of the teacher's panel as a list (plan 07, phase 13): one row per step, its number and
 * its lines of TeX rendered by KaTeX, the first row (step 0) a plain sentence for the garden the
 * trace starts from. It is one stop of the keyboard: the arrows walk its steps, Home and End go to
 * its ends, Escape folds the panel; a press on a row chooses it. Which step is the sun's and which
 * one is chosen is marked on the rows; the panel decides both.
 */

/** A row of a trace: its step and its lines of TeX. */
export interface TraceRow {
  readonly step: number;
  readonly lines: readonly string[];
}

/** A list once built. */
export interface TraceList {
  readonly element: HTMLOListElement;
  /** Marks step `chosen` as chosen and, if given, step `sun` as the one the sun shows. */
  mark(chosen: number | null, sun?: number): void;
}

/** KaTeX's HTML for each line written so far. */
const rendered = new Map<string, string>();

/** One line of TeX, rendered by KaTeX (once for each line: the same come back after every move). */
export function texLine(page: Document, tex: string): HTMLSpanElement {
  let html = rendered.get(tex);
  if (html === undefined) {
    html = renderMath(tex, false);
    rendered.set(tex, html);
  }
  const line = part(page, 'span', 'teacher-line');
  line.innerHTML = html;
  return line;
}

/**
 * Builds the list of `rows`, labelled `label`, its step 0 told by `start`. `choose` is called with
 * the step a press or a key asks for, and `fold` with Escape.
 */
export function traceList(
  page: Document,
  label: string,
  start: string,
  rows: readonly TraceRow[],
  choose: (step: number) => void,
  fold: () => void,
): TraceList {
  const list = part(page, 'ol', 'teacher-list');
  list.tabIndex = 0;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  const last = rows.length;
  let chosen = 0;
  const items = [{ step: 0, lines: [] as readonly string[] }, ...rows].map(({ step, lines }) => {
    const item = part(page, 'li', 'teacher-row');
    item.setAttribute('role', 'option');
    item.append(part(page, 'span', 'teacher-step', String(step)));
    const body = part(page, 'span', 'teacher-tex');
    if (step === 0) body.textContent = start;
    body.append(...lines.map((tex) => texLine(page, tex)));
    item.append(body);
    item.addEventListener('click', () => choose(step));
    return item;
  });
  list.append(...items);
  list.addEventListener('keydown', (event) => {
    const action = panelKey(event.key, chosen, last);
    if (action === null) return;
    // The garden behind takes no key meant for the panel (Escape would leave the level).
    event.preventDefault();
    event.stopPropagation();
    if (action.kind === 'fold') fold();
    else choose(action.step);
  });
  return {
    element: list,
    mark(step, sun) {
      chosen = step ?? sun ?? 0;
      items.forEach((item, k) => {
        item.classList.toggle('is-chosen', k === step);
        item.classList.toggle('is-sun', k === sun);
        item.setAttribute('aria-selected', String(k === step));
        if (k === sun) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      const shown = items[step ?? sun ?? 0];
      shown?.scrollIntoView({ block: 'nearest' });
    },
  };
}
