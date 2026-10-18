import type { VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import type { FlowerSnapshot, GardenSnapshot } from '@core/trace/replay';
import type { SproutKind } from '@levels/fields';
import type { DiagramGarden, Point } from './diagramGarden';
import { roundedHull } from './hull';

/**
 * The picture of a small garden of the Codex (plan 07, phase 4): where each sprout, vine, lantern
 * and folded flower goes in a box the page shows at the game's zoom, and what each one wears at a
 * moment of the day. It decides only geometry and looks; what the garden is at that moment comes
 * from the core (the rules' state, or `stateAt` over a trace), already seen as a `GardenSnapshot`.
 */

/**
 * The box, in logical pixels: as wide as the page's text, and at most this tall. Sprouts are the
 * game's (a body of radius 7); above each there is room for its sun or moon badge, below it for its
 * name, as the garden writes it (one pixel under the body).
 */
export const MINI = {
  width: 288,
  maxHeight: 136,
  radius: 7,
  badge: 6,
  nameHeight: 12,
  margin: { side: 14, top: 14, bottom: 20 },
  /** A small garden is shown at most half again the size it has in the game. */
  maxScale: 1.5,
} as const;

/** How far a flower's outline stands from its petals, and how much less each flower inside. */
const FLOWER_PAD = 11;
const NESTED_PAD_STEP = 3;
const MIN_FLOWER_PAD = 5;

/** Where the sprouts of a garden sit in the box. */
export interface MiniLayout {
  readonly width: number;
  readonly height: number;
  /** Each sprout's middle, by id, on whole pixels. */
  readonly at: readonly Point[];
}

/** What a garden wears at one moment: the core's snapshot and what is placed on its sprouts. */
export interface MiniMoment {
  readonly snapshot: GardenSnapshot;
  readonly scarecrows: readonly VertexId[];
  readonly stones: readonly VertexId[];
}

/** A sprout as drawn. */
export interface MiniSprout {
  readonly vertex: VertexId;
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly kind: SproutKind | null;
  readonly lit: boolean;
  readonly mark: 'sun' | 'moon' | null;
  /** Its place among the sprouts touched so far (1 for the first), or null if untouched. */
  readonly touched: number | null;
  /** Whether it is the base of a flower folded on top. */
  readonly base: boolean;
  readonly scarecrow: boolean;
  readonly stone: boolean;
}

/** A vine as drawn. */
export interface MiniVine {
  readonly u: VertexId;
  readonly v: VertexId;
  readonly a: Point;
  readonly b: Point;
  readonly lit: boolean;
  /** Where its lantern hangs (the middle of the vine), or null when it is dark. */
  readonly lantern: Point | null;
  /** Whether it joins two sprouts touched one after the other: part of what is being drawn. */
  readonly chosen: boolean;
  /** Whether both its sprouts are folded in one flower. */
  readonly inFlower: boolean;
}

/** A folded flower as drawn: depth 0 on top, deeper ones inside it. */
export interface MiniFlower {
  readonly id: number;
  readonly depth: number;
  readonly outline: readonly Point[];
  /** How many petals it folds: its loose sprouts and the flowers folded inside it, one each. */
  readonly petals: number;
  readonly centre: Point;
  /** Where its base sprout sits. */
  readonly base: Point;
}

/** Everything drawn in a small garden at one moment. */
export interface MiniGarden {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly sprouts: readonly MiniSprout[];
  readonly vines: readonly MiniVine[];
  /** Outermost flowers first, each followed by the flowers inside it. */
  readonly flowers: readonly MiniFlower[];
}

/**
 * Places a garden in the box: its sprouts' own places, scaled alike in both directions to fill the
 * width or the height left between the margins (never more than `maxScale`), centred across, and
 * rounded to whole pixels. The box is as tall as the garden needs, at most `maxHeight`.
 */
export function fitGarden(positions: readonly Point[]): MiniLayout {
  const { width, maxHeight, margin, maxScale } = MINI;
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  const [spanX, spanY] = [Math.max(...xs) - left, Math.max(...ys) - top];
  const room = { x: width - 2 * margin.side, y: maxHeight - margin.top - margin.bottom };
  const scale = Math.min(
    maxScale,
    spanX > 0 ? room.x / spanX : maxScale,
    spanY > 0 ? room.y / spanY : maxScale,
  );
  const shiftX = (width - spanX * scale) / 2;
  return {
    width,
    height: Math.round(spanY * scale) + margin.top + margin.bottom,
    at: positions.map((p) => ({
      x: Math.round(shiftX + (p.x - left) * scale),
      y: Math.round(margin.top + (p.y - top) * scale),
    })),
  };
}

/** How deep a flower is folded: 0 on top, 1 inside one flower, and so on. */
function depthOf(flower: FlowerSnapshot, byId: ReadonlyMap<number, FlowerSnapshot>): number {
  let depth = 0;
  for (let up = flower.parent; up !== null; up = byId.get(up)?.parent ?? null) depth++;
  return depth;
}

/** The middle of some points. */
const centreOf = (points: readonly Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});

/** The flowers of a snapshot as drawn, outermost first and each followed by those inside it. */
function flowersOf(flowers: readonly FlowerSnapshot[], at: readonly Point[]): MiniFlower[] {
  const byId = new Map(flowers.map((flower) => [flower.id, flower]));
  const drawn: MiniFlower[] = [];
  const walk = (flower: FlowerSnapshot): void => {
    const depth = depthOf(flower, byId);
    const children = flowers.filter((child) => child.parent === flower.id);
    const nested = new Set(children.flatMap((child) => child.members));
    const points = flower.members.map((v) => itemAt(at, v));
    drawn.push({
      id: flower.id,
      depth,
      outline: roundedHull(points, Math.max(MIN_FLOWER_PAD, FLOWER_PAD - NESTED_PAD_STEP * depth)),
      petals: flower.members.filter((v) => !nested.has(v)).length + children.length,
      centre: centreOf(points),
      base: itemAt(at, flower.base),
    });
    children.forEach(walk);
  };
  flowers.filter((flower) => flower.parent === null).forEach(walk);
  return drawn;
}

/**
 * The picture of `garden` placed by `layout` at the moment `moment`, with the sprouts `touched`
 * so far, in order (a pair being joined, or a chain being drawn).
 */
export function miniGarden(
  garden: Pick<DiagramGarden, 'names' | 'kinds' | 'start'>,
  layout: MiniLayout,
  moment: MiniMoment,
  touched: readonly VertexId[] = [],
): MiniGarden {
  const { snapshot } = moment;
  const at = layout.at;
  const top = snapshot.flowers.filter((flower) => flower.parent === null);
  const flowerOf = (v: VertexId): number | null =>
    top.find((flower) => flower.members.includes(v))?.id ?? null;
  const bases = new Set(top.map((flower) => flower.base));
  const sprouts = at.map((p, vertex): MiniSprout => {
    const label = itemAt(snapshot.label, vertex);
    const order = touched.indexOf(vertex);
    return {
      vertex,
      x: p.x,
      y: p.y,
      label: itemAt(garden.names, vertex),
      kind: itemAt(garden.kinds, vertex),
      lit: itemAt(snapshot.mate, vertex) !== -1,
      mark: label === 'outer' ? 'sun' : label === 'inner' ? 'moon' : null,
      touched: order < 0 ? null : order + 1,
      base: bases.has(vertex),
      scarecrow: moment.scarecrows.includes(vertex),
      stone: moment.stones.includes(vertex),
    };
  });
  const steps = new Set(touched.slice(1).map((v, i) => key(itemAt(touched, i), v)));
  const vines = garden.start.graph.edges.map(([u, v]): MiniVine => {
    const [a, b] = [itemAt(at, u), itemAt(at, v)];
    const lit = itemAt(snapshot.mate, u) === v;
    const flower = flowerOf(u);
    return {
      u,
      v,
      a,
      b,
      lit,
      lantern: lit ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null,
      chosen: steps.has(key(u, v)),
      inFlower: flower !== null && flower === flowerOf(v),
    };
  });
  return {
    width: layout.width,
    height: layout.height,
    radius: MINI.radius,
    sprouts,
    vines,
    flowers: flowersOf(snapshot.flowers, at),
  };
}

/** The same name for a vine whichever way it is walked. */
const key = (u: VertexId, v: VertexId): string => (u < v ? `${u}-${v}` : `${v}-${u}`);
