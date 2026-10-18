import type { Overlay, OverlayGroup } from '@ui/model/overlay';
import { shape } from './svgShape';

/**
 * Paints what a special diagram marks on a small garden (`ui/model/overlay.ts`), in two layers the
 * garden's painter slips round its own: under the vines, the groups wrapped in a soft halo; over
 * the vines, the strands; over the sprouts, the rings and the groups' labels. Each tone is a class
 * of `diagram.css`.
 */

/** How wide a group's halo is round its sprouts and along its vines, in pixels of the picture. */
const HALO_RADIUS = 11;

/** A group's halo: its vines and sprouts as one soft shape (the opacity is the group's). */
function paintGroup(page: Document, group: OverlayGroup): SVGGElement {
  const halo = shape(page, 'g', { class: `dg-group dg-group-${group.tone}` });
  for (const [a, b] of group.links) {
    halo.append(
      shape(page, 'line', {
        class: 'dg-group-link',
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        'stroke-width': 2 * HALO_RADIUS,
      }),
    );
  }
  for (const at of group.sprouts) {
    halo.append(
      shape(page, 'circle', { class: 'dg-group-spot', cx: at.x, cy: at.y, r: HALO_RADIUS }),
    );
  }
  return halo;
}

/** The marks that go under the vines: the groups. */
export function overlayUnder(page: Document, overlay: Overlay): SVGElement[] {
  return overlay.groups.map((group) => paintGroup(page, group));
}

/** The marks that go over the vines and under the sprouts: the strands. */
export function overlayStrands(page: Document, overlay: Overlay): SVGElement[] {
  return overlay.strands.map(({ a, b, tone }) =>
    shape(page, 'line', {
      class: `dg-strand dg-strand-${tone}`,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
    }),
  );
}

/** The marks that go over everything: the rings and the groups' labels. */
export function overlayOver(page: Document, overlay: Overlay, radius: number): SVGElement[] {
  const rings = overlay.rings.map(({ at, tone }) =>
    shape(page, 'circle', { class: `dg-mark dg-mark-${tone}`, cx: at.x, cy: at.y, r: radius + 4 }),
  );
  const labels = overlay.groups.flatMap((group) => {
    if (group.label === null) return [];
    const label = shape(page, 'text', {
      class: `dg-group-label dg-group-label-${group.tone}`,
      x: group.labelAt.x,
      y: group.labelAt.y + 4,
    });
    label.textContent = group.label;
    return [label];
  });
  return [...rings, ...labels];
}
