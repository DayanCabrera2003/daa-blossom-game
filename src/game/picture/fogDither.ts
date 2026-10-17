import { itemAt } from '@core/shared/itemAt';
import type { Point } from '../input/target';

/**
 * The clearings of the night fog (GDD §4.1: "capa semitransparente con dithering; se disuelve en
 * círculo alrededor de cada brote inspeccionado"): which pixels round an inspected sprout the fog
 * leaves open. Well inside the radius every pixel is open; on a rim of `DITHER_EDGE` pixels the
 * 4 × 4 Bayer matrix opens fewer and fewer of them towards the edge, so the clearing frays into
 * the fog instead of ending in a hard circle. A pixel open at one radius stays open at every larger
 * one, so a clearing that grows never flickers shut.
 */

/** The 4 × 4 Bayer matrix: the order in which the pixels of each 4 × 4 block open. */
// prettier-ignore
export const BAYER_4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** How wide the frayed rim of a clearing is, in logical pixels. */
export const DITHER_EDGE = 5;

/** `n` brought into 0–3, for negative offsets too. */
const mod4 = (n: number): number => ((n % 4) + 4) % 4;

/** Whether the pixel `(dx, dy)` away from a clearing's centre is open when its radius is `radius`. */
export function isOpen(dx: number, dy: number, radius: number): boolean {
  const d = Math.hypot(dx, dy);
  if (d >= radius) return false;
  // How deep into the rim the pixel is: 0 at the edge, 1 where the rim meets the open middle.
  const depth = (radius - d) / DITHER_EDGE;
  const threshold = (itemAt(itemAt(BAYER_4, mod4(dy)), mod4(dx)) + 0.5) / 16;
  return depth > threshold;
}

/** Every open pixel of a clearing of radius `radius`, as offsets from its centre, row by row. */
export function clearingPixels(radius: number): Point[] {
  const reach = Math.ceil(radius);
  const open: Point[] = [];
  for (let y = -reach; y <= reach; y++)
    for (let x = -reach; x <= reach; x++) if (isOpen(x, y, radius)) open.push({ x, y });
  return open;
}
