import type { Graph, VertexId } from '@core/graph/types';
import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import { SPROUT_AREA } from '../fields';
import { MAX_SPROUTS, MIN_SPACING } from './limits';

/**
 * Where the sprouts of a garden go when it comes without places (plan 08, section 1.3): one grown
 * by a generator, or read from a garden code, which carries no positions. Each shape suits a kind
 * of garden: a row zigzags from left to right, a ring sits on an ellipse, bees and flowers stand in
 * columns on either side, and the gardens of flowers spread from left to right by their distance
 * from R. A few passes then push apart any two sprouts still too close. The result is
 * deterministic, on whole pixels, inside the garden and keeps the spacing of the free mode; should
 * the passes ever fail, the sprouts fall back to a plain grid, which always does.
 */

/** Where a sprout sits, on whole pixels. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/** How to lay a garden out: by its look, or by which side each sprout is on. */
export type LayoutShape =
  | { readonly kind: 'row' }
  | { readonly kind: 'ring' }
  | { readonly kind: 'layers' }
  | { readonly kind: 'sides'; readonly side: readonly (0 | 1)[] };

/** Room left inside the sprout area, so names and lanterns at the edges stay clear of it. */
const PAD = 12;
const LEFT = SPROUT_AREA.x0 + PAD;
const RIGHT = SPROUT_AREA.x1 - PAD;
const TOP = SPROUT_AREA.y0 + PAD;
const BOTTOM = SPROUT_AREA.y1 - PAD;
const MIDDLE_Y = (TOP + BOTTOM) / 2;

/** The spacing the layouts aim for: the free mode's, with a little air for rounding. */
const AIM = MIN_SPACING + 4;

/** The most sprouts a column holds with `AIM` between them. */
const PER_COLUMN = Math.floor((BOTTOM - TOP) / AIM) + 1;

/** How far a row's sprouts rise and fall from its middle line. */
const ZIGZAG = 24;

/** Between two columns of the same side of a garden of bees and flowers. */
const SIDE_COLUMN_GAP = 40;

/** How many times the sprouts still too close are pushed apart before giving up on the shape. */
const PASSES = 60;

/** `count` values spread evenly from `from` to `to`; one value sits halfway. */
const spread = (count: number, from: number, to: number): number[] =>
  Array.from({ length: count }, (_, i) =>
    count === 1 ? (from + to) / 2 : from + ((to - from) * i) / (count - 1),
  );

/** A row from left to right, rising and falling by turns so neighbours never touch. */
const row = (n: number): Spot[] =>
  spread(n, LEFT, RIGHT).map((x, i) => ({ x, y: MIDDLE_Y + (i % 2 === 0 ? -1 : 1) * ZIGZAG }));

/** A ring on the widest ellipse of the garden, from its top, clockwise. */
const ring = (n: number): Spot[] => {
  const [rx, ry] = [(RIGHT - LEFT) / 2, (BOTTOM - TOP) / 2];
  const cx = (LEFT + RIGHT) / 2;
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + rx * Math.cos(angle), y: MIDDLE_Y + ry * Math.sin(angle) };
  });
};

/** Columns of sprouts, each split into columns that fit, in order, as lists of sprouts. */
const fitColumns = (columns: readonly VertexId[][]): VertexId[][] =>
  columns.flatMap((column) =>
    Array.from({ length: Math.ceil(column.length / PER_COLUMN) }, (_, k) =>
      column.slice(k * PER_COLUMN, (k + 1) * PER_COLUMN),
    ),
  );

/** The sprouts of each column standing at `x`, spread evenly up and down the middle line. */
const standColumn = (spots: Spot[], column: readonly VertexId[], x: number): void => {
  const half = ((column.length - 1) * AIM) / 2;
  spread(column.length, MIDDLE_Y - half, MIDDLE_Y + half).forEach((y, i) => {
    spots[itemAt(column, i)] = { x, y };
  });
};

/**
 * The gardens of flowers: each sprout in the column of its distance from the first sprout of its
 * piece (R, sprout 0, for the first), the pieces one after another from left to right.
 */
const layers = (graph: Graph): Spot[] => {
  const depth = new Array<number>(graph.n).fill(-1);
  const columns: VertexId[][] = [];
  for (let root = 0; root < graph.n; root++) {
    if (depth[root] !== -1) continue;
    // A new piece starts after the columns of the pieces before it.
    const offset = columns.length;
    depth[root] = 0;
    const queue: VertexId[] = [root];
    for (let head = 0; head < queue.length; head++) {
      const u = itemAt(queue, head);
      const d = itemAt(depth, u);
      (columns[offset + d] ??= []).push(u);
      for (const v of itemAt(graph.adjacency, u)) {
        if (depth[v] !== -1) continue;
        depth[v] = d + 1;
        queue.push(v);
      }
    }
  }
  const fitted = fitColumns(columns);
  const spots: Spot[] = new Array<Spot>(graph.n);
  const xs = spread(fitted.length, LEFT, RIGHT);
  fitted.forEach((column, c) => standColumn(spots, column, itemAt(xs, c)));
  return spots;
};

/** The bees (side 0) in columns on the left, the flowers (side 1) in columns on the right. */
const sides = (side: readonly (0 | 1)[]): Spot[] => {
  const spots: Spot[] = new Array<Spot>(side.length);
  const centre = (LEFT + RIGHT) / 2;
  for (const s of [0, 1] as const) {
    const members = side.flatMap((t, v) => (t === s ? [v] : []));
    // Each side's columns grow outwards from the middle of the garden.
    fitColumns([members]).forEach((column, c) => {
      const away = SIDE_COLUMN_GAP * (c + 1);
      standColumn(spots, column, s === 0 ? centre - away : centre + away);
    });
  }
  return spots;
};

/** Whether every sprout sits on a whole pixel inside the garden, the spacing apart. */
const readable = (spots: readonly Spot[]): boolean =>
  spots.every(
    ({ x, y }, i) =>
      x >= SPROUT_AREA.x0 &&
      x <= SPROUT_AREA.x1 &&
      y >= SPROUT_AREA.y0 &&
      y <= SPROUT_AREA.y1 &&
      spots.slice(i + 1).every((other) => Math.hypot(other.x - x, other.y - y) >= MIN_SPACING),
  );

/** Keeps a value between two bounds. */
const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

/**
 * Pushes apart, a few passes over every pair, the sprouts closer than the spacing aimed for, each
 * by half of what is missing, then rounds them to whole pixels inside the garden.
 */
const settle = (start: readonly Spot[]): Spot[] => {
  const spots = start.map(({ x, y }) => ({ x, y }));
  for (let pass = 0; pass < PASSES; pass++) {
    let moved = false;
    spots.forEach((a, i) => {
      for (const b of spots.slice(i + 1)) {
        const [dx, dy] = [b.x - a.x, b.y - a.y];
        const distance = Math.hypot(dx, dy);
        if (distance >= AIM) continue;
        // Two sprouts on the same spot part sideways.
        const [ux, uy] = distance === 0 ? [1, 0] : [dx / distance, dy / distance];
        const push = (AIM - distance) / 2;
        a.x = clamp(a.x - ux * push, SPROUT_AREA.x0, SPROUT_AREA.x1);
        a.y = clamp(a.y - uy * push, SPROUT_AREA.y0, SPROUT_AREA.y1);
        b.x = clamp(b.x + ux * push, SPROUT_AREA.x0, SPROUT_AREA.x1);
        b.y = clamp(b.y + uy * push, SPROUT_AREA.y0, SPROUT_AREA.y1);
        moved = true;
      }
    });
    if (!moved) break;
  }
  return spots.map(({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }));
};

/** A plain grid of `n` sprouts, row after row: always inside the garden and apart. */
const grid = (n: number): Spot[] => {
  const perRow = Math.floor((RIGHT - LEFT) / AIM) + 1;
  return Array.from({ length: n }, (_, i) => ({
    x: LEFT + AIM * (i % perRow),
    y: TOP + AIM * Math.floor(i / perRow),
  }));
};

/** Where each sprout of `graph` goes, in sprout order, laid out in `shape`. */
export function layoutGarden(graph: Graph, shape: LayoutShape): Spot[] {
  invariant(graph.n <= MAX_SPROUTS, `the free mode lays out ${MAX_SPROUTS} sprouts at most`);
  invariant(
    shape.kind !== 'sides' || shape.side.length === graph.n,
    'a garden of bees and flowers names the side of every sprout',
  );
  const start =
    shape.kind === 'row'
      ? row(graph.n)
      : shape.kind === 'ring'
        ? ring(graph.n)
        : shape.kind === 'sides'
          ? sides(shape.side)
          : layers(graph);
  const settled = settle(start);
  return readable(settled) ? settled : grid(graph.n);
}
