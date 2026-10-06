import { itemAt } from '@core/shared/itemAt';
import type { Point } from '../input/target';

/**
 * Where the pieces of the tangle drift when it separates (2.1): each piece moves as a whole, away
 * from the others, until a clear gap lies between every two, and the lot stays inside the garden.
 * Pure geometry on the boxes around the pieces.
 */

/** A box around a piece (or the garden): left, top, right, bottom. */
export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** The least clear space between two separated pieces, in canvas pixels. */
export const PIECE_GAP = 24;

/** How far apart two neighbouring pieces drift beyond the gap, so a separation always shows. */
const DRIFT = 16;

/** One way to line the pieces up: along the row (x) or the column (y). */
type Axis = 'x' | 'y';

/** A box's start and end along an axis. */
const span = (box: Box, axis: Axis): [number, number] =>
  axis === 'x' ? [box.x0, box.x1] : [box.y0, box.y1];

/**
 * Lines the pieces up along one axis, in the order they already have on it: each drifts outwards
 * from the middle of the line and is pushed on until it clears the previous one by the gap; then the
 * whole line shifts back inside the garden, starting at its edge when it is too long to fit.
 * Returns the moves along the axis, by piece, and whether the line fits.
 */
function lineUp(
  boxes: readonly Box[],
  area: Box,
  axis: Axis,
): { readonly moves: number[]; readonly fits: boolean } {
  const order = boxes
    .map((_, i) => i)
    .sort((a, b) => span(itemAt(boxes, a), axis)[0] - span(itemAt(boxes, b), axis)[0] || a - b);
  const middle = (boxes.length - 1) / 2;
  const starts = new Array<number>(boxes.length).fill(0);
  let end = -Infinity;
  let first = Infinity;
  order.forEach((piece, rank) => {
    const [from, to] = span(itemAt(boxes, piece), axis);
    const start = Math.max(from + (rank - middle) * DRIFT, end + PIECE_GAP);
    starts[piece] = start;
    first = Math.min(first, start);
    end = start + (to - from);
  });
  const [low, high] = span(area, axis);
  const fits = end - first <= high - low;
  const shift = !fits || first < low ? low - first : end > high ? high - end : 0;
  const moves = boxes.map((box, i) => itemAt(starts, i) + shift - span(box, axis)[0]);
  return { moves, fits };
}

/**
 * The move of each piece once the tangle separates. The pieces line up along the row or along the
 * column, whichever fits inside `area` with less travel; when neither fits, along the row from the
 * garden's left edge, still apart, even if the last piece crosses the right edge.
 */
export function driftApart(boxes: readonly Box[], area: Box): Point[] {
  const travel = (moves: readonly number[]) => moves.reduce((sum, move) => sum + Math.abs(move), 0);
  const row = lineUp(boxes, area, 'x');
  const column = lineUp(boxes, area, 'y');
  const useColumn = column.fits && (!row.fits || travel(column.moves) < travel(row.moves));
  return useColumn ? column.moves.map((y) => ({ x: 0, y })) : row.moves.map((x) => ({ x, y: 0 }));
}
