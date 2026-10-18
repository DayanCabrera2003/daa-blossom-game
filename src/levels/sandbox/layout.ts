import type { Graph, VertexId } from '@core/graph/types';
import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import { SPROUT_AREA, type SproutKind } from '../fields';
import { MAX_SPROUTS, MIN_SPACING } from './limits';
import { LETTERS } from './names';
import { untangle, type Field } from './untangle';

/**
 * Where the sprouts of a garden go when it comes without places (plan 08, section 1.3): one grown
 * by a generator, or read from a garden code, which carries no positions. Each shape suits a kind
 * of garden: a row zigzags from left to right, a ring runs along two arcs, bees and flowers stand
 * in columns on either side, and the gardens of flowers spread from left to right by their distance
 * from R, each layer a column over the garden's height. Every shape is drawn over the whole free
 * area of the editor, between its header and its two rows of buttons, and then untangled
 * (`untangle.ts`) until no name of the free mode (A, B, C… in sprout order) is drawn over a sprout,
 * another name or a lantern, the checks of the catalog's levels. The result is deterministic, on
 * whole pixels, inside the garden and keeps the spacing of the free mode; should the untangling
 * ever fail, the sprouts start again from a plain grid.
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

/** What a sprout on side 0 (a bee) or side 1 (a flower) of a garden of bees and flowers is. */
export const sideKind = (side: 0 | 1): SproutKind => (side === 0 ? 'bee' : 'flower');

/**
 * Where the sprouts of a laid-out garden go: the sprout area, less a margin at the sides for the
 * names, two pixels at the top (under the editor's header) and four at the bottom, so the name of
 * the lowest sprout ends above the editor's rows of buttons.
 */
const FIELD: Field = {
  left: SPROUT_AREA.x0 + 12,
  right: SPROUT_AREA.x1 - 12,
  top: SPROUT_AREA.y0 + 2,
  bottom: SPROUT_AREA.y1 - 4,
};
const MIDDLE_Y = (FIELD.top + FIELD.bottom) / 2;
const CENTRE_X = (FIELD.left + FIELD.right) / 2;

/** The spacing the layouts keep: the free mode's, with a little air for rounding. */
const AIM = MIN_SPACING + 2;

/**
 * How far a row's sprouts rise and fall from its middle line: far enough that the lantern of a
 * vine between two neighbours hangs clear of the name of the higher one.
 */
const ZIGZAG = 30;

/** The widest step between two sprouts of a column, so a short column does not scatter. */
const MOST_STEP = 46;

/** How far the sprouts of a column of flowers step aside by turns, so their names stay clear. */
const STAGGER = 12;

/**
 * The step between two sprouts of a column of flowers, staggered, and of a column of bees or
 * flowers, which is not: under it a name would be drawn over the sprout below.
 */
const STAGGERED_STEP = 16;
const STRAIGHT_STEP = 27;

/** How far the columns of each side of a garden of bees and flowers stand from its middle. */
const SIDE_COLUMNS = [80, 140, 200] as const;

/** How much the arcs of a ring bow out from their ends. */
const BOW = 40;

/** `count` values spread evenly from `from` to `to`; one value sits halfway. */
const spread = (count: number, from: number, to: number): number[] =>
  Array.from({ length: count }, (_, i) =>
    count === 1 ? (from + to) / 2 : from + ((to - from) * i) / (count - 1),
  );

/** A row from left to right, rising and falling by turns so neighbours never touch. */
const row = (n: number): Spot[] =>
  spread(n, FIELD.left, FIELD.right).map((x, i) => ({
    x,
    y: MIDDLE_Y + (i % 2 === 0 ? -1 : 1) * ZIGZAG,
  }));

/**
 * A ring: the first half of the sprouts along an arc over the garden from left to right, the rest
 * back along an arc under it, so the ring closes at both ends with nothing in between.
 */
const ring = (n: number): Spot[] => {
  const over = Math.ceil(n / 2);
  const under = n - over;
  const halfWidth = (FIELD.right - FIELD.left) / 2;
  // How far from its middle a point of either arc is, from 0 to 1.
  const bend = (x: number): number => BOW * ((x - CENTRE_X) / halfWidth) ** 2;
  // The arc under the garden keeps half a step in from the ends when it is the shorter one.
  const inset = under < over && over > 1 ? (FIELD.right - FIELD.left) / (over - 1) / 2 : 0;
  return [
    ...spread(over, FIELD.left, FIELD.right).map((x) => ({
      x,
      y: (over === 1 && under === 0 ? MIDDLE_Y : FIELD.top) + bend(x),
    })),
    ...spread(under, FIELD.right - inset, FIELD.left + inset).map((x) => ({
      x,
      y: FIELD.bottom - bend(x),
    })),
  ];
};

/** Splits a list into `parts` lists of sizes as even as can be, in order. */
const chunks = <T>(list: readonly T[], parts: number): T[][] =>
  Array.from({ length: parts }, (_, k) =>
    list.slice(Math.round((k * list.length) / parts), Math.round(((k + 1) * list.length) / parts)),
  );

/** How many sprouts a column holds, `step` apart, inside the field. */
const holds = (step: number): number => Math.floor((FIELD.bottom - FIELD.top) / step) + 1;

/**
 * The sprouts of `column` standing around `x` over the garden's height, at most `MOST_STEP` apart,
 * centred on `middle` but kept inside; with `stagger`, every other one a little to each side.
 */
const standColumn = (
  spots: Spot[],
  column: readonly VertexId[],
  x: number,
  middle: number,
  stagger: number,
): void => {
  const count = column.length;
  const step = count === 1 ? 0 : Math.min(MOST_STEP, (FIELD.bottom - FIELD.top) / (count - 1));
  const half = (step * (count - 1)) / 2;
  const centre = Math.min(FIELD.bottom - half, Math.max(FIELD.top + half, middle));
  spread(count, centre - half, centre + half).forEach((y, i) => {
    const aside = count === 1 ? 0 : (i % 2 === 0 ? -1 : 1) * stagger;
    spots[itemAt(column, i)] = { x: x + aside, y };
  });
};

/**
 * The gardens of flowers: each sprout in the column of its distance from the first sprout of its
 * piece (R, sprout 0, for the first), the pieces one after another from left to right. Columns
 * spread over the garden's width and each over its height; neighbouring columns rise and fall by
 * turns, so a long chain zigzags like a row.
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
  const fitted = columns.flatMap((column) =>
    chunks(column, Math.ceil(column.length / holds(STAGGERED_STEP))),
  );
  const spots: Spot[] = new Array<Spot>(graph.n);
  const inset = fitted.some((column) => column.length > 1) ? STAGGER : 0;
  const xs = spread(fitted.length, FIELD.left + inset, FIELD.right - inset);
  fitted.forEach((column, c) => {
    const middle = MIDDLE_Y + (c % 2 === 0 ? -1 : 1) * (fitted.length > 1 ? ZIGZAG : 0);
    standColumn(spots, column, itemAt(xs, c), middle, STAGGER);
  });
  return spots;
};

/** How many times each side of a garden of bees and flowers is sorted by its neighbours. */
const SWEEPS = 8;

/**
 * The bees (side 0) and the flowers (side 1), each side in the order that crosses fewer vines:
 * a few sweeps in which every sprout of one side takes the mean place of its neighbours on the
 * other (the barycentre rule), ties and sprouts without a neighbour keeping their place.
 */
const sideOrder = (graph: Graph, side: readonly (0 | 1)[]): VertexId[][] => {
  const order = ([0, 1] as const).map((s) => side.flatMap((t, v) => (t === s ? [v] : [])));
  const place = new Array<number>(graph.n).fill(0);
  const settle = (s: 0 | 1): void => itemAt(order, s).forEach((v, k) => (place[v] = k));
  settle(0);
  settle(1);
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    const s = sweep % 2 === 0 ? 1 : 0;
    const mean = (v: VertexId): number => {
      const near = itemAt(graph.adjacency, v);
      return near.length === 0
        ? itemAt(place, v)
        : near.reduce((sum, u) => sum + itemAt(place, u), 0) / near.length;
    };
    order[s] = [...itemAt(order, s)].sort(
      (u, v) => mean(u) - mean(v) || itemAt(place, u) - itemAt(place, v),
    );
    settle(s);
  }
  return order;
};

/**
 * The bees in columns on the left, the flowers in columns on the right, each side in the order of
 * `sideOrder` from top to bottom: with more than one column, a side deals its sprouts to them by
 * turns, so going down the garden follows that order.
 */
const sides = (graph: Graph, side: readonly (0 | 1)[]): Spot[] => {
  const spots: Spot[] = new Array<Spot>(side.length);
  sideOrder(graph, side).forEach((members, s) => {
    const count = Math.ceil(members.length / holds(STRAIGHT_STEP));
    const columns = Array.from({ length: count }, (_, c) =>
      members.filter((_, k) => k % count === c),
    );
    // Each side's columns grow outwards from the middle of the garden.
    columns.forEach((column, c) => {
      const away = itemAt(SIDE_COLUMNS, c);
      standColumn(spots, column, s === 0 ? CENTRE_X - away : CENTRE_X + away, MIDDLE_Y, 0);
    });
  });
  return spots;
};

/** A plain grid of `n` sprouts, row after row, far enough apart for a name under each. */
const grid = (n: number): Spot[] => {
  const [across, down] = [2 * STAGGER, STRAIGHT_STEP + 1];
  const perRow = Math.floor((FIELD.right - FIELD.left) / across) + 1;
  return Array.from({ length: n }, (_, i) => ({
    x: FIELD.left + across * (i % perRow),
    y: FIELD.top + down * Math.floor(i / perRow),
  }));
};

/** The spots rounded to whole pixels and kept inside the field. */
const onPixels = (spots: readonly Spot[]): Spot[] =>
  spots.map(({ x, y }) => ({
    x: Math.min(FIELD.right, Math.max(FIELD.left, Math.round(x))),
    y: Math.min(FIELD.bottom, Math.max(FIELD.top, Math.round(y))),
  }));

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
          ? sides(graph, shape.side)
          : layers(graph);
  const names = LETTERS.slice(0, graph.n);
  // Bees and flowers wear other crowns than plain sprouts, so their names need other room.
  const kinds = shape.kind === 'sides' ? shape.side.map(sideKind) : names.map(() => undefined);
  const shaped = untangle(graph, names, kinds, onPixels(start), FIELD, AIM);
  if (shaped.clean) return [...shaped.spots];
  const plain = untangle(graph, names, kinds, onPixels(grid(graph.n)), FIELD, AIM);
  return [...(plain.clean ? plain : shaped).spots];
}
