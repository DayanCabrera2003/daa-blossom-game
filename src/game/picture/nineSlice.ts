import type { PixelRect } from '../assets/frames';

/**
 * A picture cut in nine to stretch it to any size (a "9-slice", plan 06 section 1.6): the four
 * corners are copied as they are, the four edges stretch along their length and the middle in both
 * directions, so a 16 × 16 wooden panel frames a box of any size with its border intact. Pure, so
 * every renderer can draw it with plain images (the engine's own nine-slice object needs WebGL).
 */

/** How far the border reaches in from each side of the source picture, in pixels. */
export interface Slices {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** One patch: a rectangle of the source drawn stretched over a rectangle of the target. */
export interface Patch {
  readonly src: PixelRect;
  readonly dst: PixelRect;
}

/** One span of an axis: where it starts and how long it is, in the source and in the target. */
interface Span {
  readonly from: number;
  readonly length: number;
  readonly to: number;
  readonly size: number;
}

/**
 * The three spans of one axis, the start border, the middle and the end border, from a source of
 * `size` to a target from `offset` that is `length` long. The borders keep their size; the middle
 * takes what is left, or nothing.
 */
function axis(start: number, end: number, size: number, offset: number, length: number): Span[] {
  return [
    { from: 0, length: start, to: offset, size: start },
    {
      from: start,
      length: size - start - end,
      to: offset + start,
      size: Math.max(0, length - start - end),
    },
    { from: size - end, length: end, to: offset + length - end, size: end },
  ];
}

/**
 * The patches that draw `source`, bordered as `slices` says, over `target`, row by row from the
 * top-left corner. A patch with no room in the target (the middle of a target no bigger than its
 * borders) is left out.
 */
export function nineSlice(
  source: { readonly width: number; readonly height: number },
  slices: Slices,
  target: PixelRect,
): Patch[] {
  const columns = axis(slices.left, slices.right, source.width, target.x, target.width);
  const rows = axis(slices.top, slices.bottom, source.height, target.y, target.height);
  return rows
    .flatMap((row) =>
      columns.map((column) => ({
        src: { x: column.from, y: row.from, width: column.length, height: row.length },
        dst: { x: column.to, y: row.to, width: column.size, height: row.size },
      })),
    )
    .filter(({ dst }) => dst.width > 0 && dst.height > 0);
}
