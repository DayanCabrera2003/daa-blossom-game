import type { RaceResult } from '@core/cost/benchmark';
import { itemAt } from '@core/shared/itemAt';
import type { Translate } from '@services/i18n';
import { chartPicture, type ChartPicture } from '@ui/model/chartPicture';
import { chartWords, numberedSizes, raceCount } from '@ui/model/chartWords';
import type { DiagramSpec } from '@ui/model/diagramSpec';
import { helpKeys } from '@ui/model/diagramWords';
import type { Point } from '@ui/model/diagramGarden';
import { MINI } from '@ui/model/miniGarden';
import { part } from './parts';
import { stepControls } from './stepControls';
import { pointsOf, shape } from './svgShape';

/**
 * The chart of the races of C11 (plan 07, phase 5): the steps of the mechanical gardener and of
 * Bruto against the size of the garden, race by race as the sun walks them, the same races the
 * player watched in 6.4 and 6.5. The dots are `ui/model/chartPicture.ts`'s; the colours are the
 * game's (the gardener amber, Bruto blue); Bruto asleep is written "zzz" at the top edge, his dot
 * above it an arrow out of the chart.
 */

/** The chart's picture, in its pixels: as wide as a small garden, and the plot inside its margins. */
const CHART = { width: MINI.width, height: 150 } as const;
const PLOT = { left: 26, top: 24, right: 12, bottom: 20 } as const;
const BOX = {
  width: CHART.width - PLOT.left - PLOT.right,
  height: CHART.height - PLOT.top - PLOT.bottom,
} as const;

/** How far apart two sizes along the bottom must be to both get their number. */
const SIZE_GAP = 14;

/** A text of the chart at (x, y), of `className`. */
function label(page: Document, className: string, x: number, y: number, text: string) {
  const made = shape(page, 'text', { class: className, x, y });
  made.textContent = text;
  return made;
}

/** Paints `picture` into `svg`: axes, legend, sizes, the gardener's curve and Bruto's dots. */
function paintChart(svg: SVGSVGElement, picture: ChartPicture, t: Translate): void {
  const page = svg.ownerDocument;
  const at = (dot: { x: number; y: number }): Point => ({
    x: PLOT.left + dot.x,
    y: PLOT.top + dot.y,
  });
  const bottom = PLOT.top + BOX.height;
  const parts: SVGElement[] = [
    shape(page, 'rect', { class: 'dg-ground', width: CHART.width, height: CHART.height }),
    shape(page, 'polyline', {
      class: 'dg-axis',
      points: pointsOf([
        { x: PLOT.left, y: PLOT.top },
        { x: PLOT.left, y: bottom },
        { x: PLOT.left + BOX.width, y: bottom },
      ]),
    }),
    // The legend, each runner's name after a dot of its colour; the axes' names.
    shape(page, 'circle', { class: 'dg-runner-automaton', cx: 6, cy: 7, r: 2 }),
    label(page, 'dg-chart-text', 11, 11, t('race.legend.automaton')),
    shape(page, 'rect', {
      class: 'dg-runner-bruto',
      x: CHART.width / 2 + 4,
      y: 5,
      width: 4,
      height: 4,
    }),
    label(page, 'dg-chart-text', CHART.width / 2 + 11, 11, t('race.legend.bruto')),
    label(page, 'dg-chart-axis', 2, PLOT.top - 3, t('race.axis.steps')),
    label(
      page,
      'dg-chart-axis dg-chart-end',
      CHART.width - 2,
      CHART.height - 1,
      t('race.axis.sprouts'),
    ),
    ...numberedSizes(picture.sizes, SIZE_GAP).map(({ n, x }) =>
      label(page, 'dg-chart-axis dg-chart-middle', PLOT.left + x, bottom + 10, String(n)),
    ),
  ];
  const curve = picture.automaton.map(at);
  if (curve.length >= 2) {
    parts.push(shape(page, 'polyline', { class: 'dg-curve-automaton', points: pointsOf(curve) }));
  }
  for (const { x, y } of curve) {
    parts.push(shape(page, 'circle', { class: 'dg-runner-automaton', cx: x, cy: y, r: 2.5 }));
  }
  const fits = picture.bruto.filter((dot) => dot.mark === 'shown').map(at);
  if (fits.length >= 2) {
    parts.push(shape(page, 'polyline', { class: 'dg-curve-bruto', points: pointsOf(fits) }));
  }
  for (const dot of picture.bruto) {
    const { x, y } = at(dot);
    if (dot.mark === 'shown') {
      parts.push(
        shape(page, 'rect', { class: 'dg-runner-bruto', x: x - 2, y: y - 2, width: 4, height: 4 }),
      );
    } else if (dot.mark === 'above') {
      parts.push(
        shape(page, 'polygon', {
          class: 'dg-runner-bruto',
          points: pointsOf([
            { x: x - 3, y: y + 3 },
            { x: x + 3, y: y + 3 },
            { x, y: y - 2 },
          ]),
        }),
      );
    } else {
      parts.push(label(page, 'dg-chart-bruto dg-chart-middle', x, y - 2, t('race.asleep')));
    }
  }
  svg.replaceChildren(...parts);
}

/** Builds the chart of `races` in `hole`, walked race by race. */
export function chartDiagram(
  hole: HTMLElement,
  races: readonly RaceResult[],
  spec: DiagramSpec,
  t: Translate,
): void {
  const page = hole.ownerDocument;
  const figure = part(page, 'figure', 'dg dg-chart');
  if (spec.title !== undefined) figure.append(part(page, 'figcaption', 'dg-title', t(spec.title)));
  const svg = shape(page, 'svg', {
    class: 'dg-svg',
    role: 'img',
    'aria-label': t('diagram.chart.label'),
    viewBox: `0 0 ${CHART.width} ${CHART.height}`,
  });
  svg.style.setProperty('--diagram-width', String(CHART.width));
  svg.style.setProperty('--diagram-height', String(CHART.height));
  const controls = stepControls(page, t, 1, races.length, (k) => show(k));
  const told = part(page, 'p', 'dg-step');
  told.setAttribute('aria-live', 'polite');
  const help = part(
    page,
    'p',
    'dg-help dg-aside',
    helpKeys(spec)
      .map((key) => t(key))
      .join(' '),
  );
  figure.append(svg, ...controls.rows, told, help);
  hole.replaceChildren(figure);

  /** Shows the first `k` races. */
  const show = (k: number): void => {
    paintChart(svg, chartPicture(races, k, BOX), t);
    controls.show(k, raceCount(races, k, t));
    told.textContent = chartWords(itemAt(races, k - 1), t);
  };
  show(1);
}
