import type { Point } from '@ui/model/diagramGarden';

/**
 * The SVG elements the small gardens and charts of the Codex are drawn with: a new element with
 * its attributes, and a list of points as SVG writes it.
 */

const SVG = 'http://www.w3.org/2000/svg';

/** A new SVG element with its attributes. */
export function shape<K extends keyof SVGElementTagNameMap>(
  page: Document,
  tag: K,
  attributes: Readonly<Record<string, string | number>>,
): SVGElementTagNameMap[K] {
  const made = page.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) made.setAttribute(name, String(value));
  return made;
}

/** The points of a polygon or polyline as SVG writes them. */
export const pointsOf = (points: readonly Point[]): string =>
  points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
