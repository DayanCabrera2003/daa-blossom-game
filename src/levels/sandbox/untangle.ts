import type { Graph, VertexId } from '@core/graph/types';
import { itemAt } from '@core/shared/itemAt';
import { labelBox, lanternBox } from '../layoutChecks';
import { PICTURE_SIZES } from '../pictureSizes';
import { boxesNear, boxNearCircle, segmentsCross, type Box, type Point } from '../plane';

/**
 * Makes a garden laid out without places readable (plan 08, section 1.3): a few rounds in which
 * every sprout caught in a clash moves to the spot of the garden that clashes least. A clash is
 * anything the layout checks of the catalog's levels would report about a name (drawn over a
 * sprout, another name or the lantern any vine may carry), or two sprouts closer than the spacing.
 * A sprout only moves when that lowers its clashes, so the rounds always end; among the spots that
 * clash as little, it takes the one whose vines cross the fewest others and then the nearest, so a
 * shape that already reads well keeps its look. Pure and deterministic.
 */

/** The rectangle where sprouts may go, on whole pixels. */
export interface Field {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** How far apart, in pixels, the spots a sprout may move to are. */
const STEP = 8;

/** The most rounds over the garden; each one moves every sprout still caught in a clash. */
const ROUNDS = 40;

/** What a clash weighs against one more crossing vine, and a pixel moved against a crossing. */
const CLASH = 1000;
const PER_PIXEL = 0.02;

const { sproutRadius: radius, labelClearance: clearance } = PICTURE_SIZES;

/** The spots of the field a sprout may move to, row by row. */
const spotsOf = (field: Field): Point[] => {
  const spots: Point[] = [];
  for (let y = field.top; y <= field.bottom; y += STEP) {
    for (let x = field.left; x <= field.right; x += STEP) spots.push({ x, y });
  }
  return spots;
};

/** A garden being untangled: where each sprout and lantern is, and how to count its clashes. */
class Tangle {
  private readonly spots: Point[];
  private readonly labels: Box[];
  private readonly lanterns: Box[];
  /** The vines of each sprout, by their index in the garden. */
  private readonly vinesOf: number[][];

  constructor(
    private readonly graph: Graph,
    private readonly names: readonly string[],
    start: readonly Point[],
    private readonly spacing: number,
  ) {
    this.spots = start.map(({ x, y }) => ({ x, y }));
    this.labels = this.spots.map((spot, v) => this.labelAt(v, spot));
    this.lanterns = graph.edges.map(([u, v]) => lanternBox(this.at(u), this.at(v)));
    this.vinesOf = Array.from({ length: graph.n }, () => []);
    graph.edges.forEach(([u, v], e) => {
      itemAt(this.vinesOf, u).push(e);
      itemAt(this.vinesOf, v).push(e);
    });
  }

  /** Where sprout `v` is now. */
  at(v: VertexId): Point {
    return itemAt(this.spots, v);
  }

  /** The spots of every sprout, in sprout order. */
  result(): Point[] {
    return this.spots.map(({ x, y }) => ({ x, y }));
  }

  private labelAt(v: VertexId, spot: Point): Box {
    return labelBox({ label: itemAt(this.names, v), x: spot.x, y: spot.y });
  }

  /** Where the other end of vine `e` is, seen from sprout `v` standing at `spot`. */
  private ends(e: number, v: VertexId, spot: Point): [Point, Point] {
    const [a, b] = itemAt(this.graph.edges, e);
    return [a === v ? spot : this.at(a), b === v ? spot : this.at(b)];
  }

  /**
   * The clashes sprout `v` would be caught in standing at `spot`: each pair of things it would
   * crowd, counted once, so the clashes of the whole garden fall by as much as `v`'s do.
   */
  clashes(v: VertexId, spot: Point): number {
    const own = this.labelAt(v, spot);
    let count = 0;
    for (let u = 0; u < this.graph.n; u++) {
      if (u === v) continue;
      const other = this.at(u);
      const label = itemAt(this.labels, u);
      if (Math.hypot(other.x - spot.x, other.y - spot.y) < this.spacing) count++;
      if (boxNearCircle(own, other, radius, clearance)) count++;
      if (boxNearCircle(label, spot, radius, clearance)) count++;
      if (boxesNear(own, label, clearance)) count++;
    }
    const mine = new Set(itemAt(this.vinesOf, v));
    this.graph.edges.forEach((_, e) => {
      if (!mine.has(e)) {
        if (boxesNear(own, itemAt(this.lanterns, e), clearance)) count++;
        return;
      }
      // A lantern of `v`'s own vines moves with it, past every name, `v`'s own included.
      const lantern = lanternBox(...this.ends(e, v, spot));
      for (let s = 0; s < this.graph.n; s++) {
        if (boxesNear(s === v ? own : itemAt(this.labels, s), lantern, clearance)) count++;
      }
    });
    return count;
  }

  /** How many crossings the vines of `v` would make with the others, `v` standing at `spot`. */
  crossings(v: VertexId, spot: Point): number {
    let count = 0;
    for (const e of itemAt(this.vinesOf, v)) {
      const [a, b] = this.ends(e, v, spot);
      this.graph.edges.forEach((_, f) => {
        if (f !== e && segmentsCross(a, b, ...this.ends(f, v, spot))) count++;
      });
    }
    return count;
  }

  /** Puts sprout `v` at `spot`, with its name and the lanterns of its vines. */
  move(v: VertexId, spot: Point): void {
    this.spots[v] = spot;
    this.labels[v] = this.labelAt(v, spot);
    for (const e of itemAt(this.vinesOf, v)) {
      this.lanterns[e] = lanternBox(...this.ends(e, v, spot));
    }
  }
}

/** The spot sprout `v` would clash least at, or null when none lowers its clashes. */
function betterSpot(tangle: Tangle, v: VertexId, field: readonly Point[]): Point | null {
  const here = tangle.at(v);
  const now = tangle.clashes(v, here);
  if (now === 0) return null;
  let best = now * CLASH + tangle.crossings(v, here);
  let found: Point | null = null;
  for (const spot of field) {
    const clashes = tangle.clashes(v, spot);
    if (clashes >= now) continue;
    const cost =
      clashes * CLASH +
      tangle.crossings(v, spot) +
      PER_PIXEL * Math.hypot(spot.x - here.x, spot.y - here.y);
    if (cost < best) [best, found] = [cost, spot];
  }
  return found;
}

/** A garden untangled: where its sprouts went, and whether anything still clashes. */
export interface Untangled {
  readonly spots: readonly Point[];
  readonly clean: boolean;
}

/**
 * The garden of `graph`, named `names`, moved from `start` until nothing clashes (or nothing can
 * move for the better); a sprout that moves goes to a spot of `field`.
 */
export function untangle(
  graph: Graph,
  names: readonly string[],
  start: readonly Point[],
  field: Field,
  spacing: number,
): Untangled {
  const tangle = new Tangle(graph, names, start, spacing);
  const spots = spotsOf(field);
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (let v = 0; v < graph.n; v++) {
      const spot = betterSpot(tangle, v, spots);
      if (spot === null) continue;
      tangle.move(v, spot);
      moved = true;
    }
    if (!moved) break;
  }
  const result = tangle.result();
  return { spots: result, clean: result.every((spot, v) => tangle.clashes(v, spot) === 0) };
}
