import { members, nodesWithin } from '@core/blossom/hierarchy';
import type { GardenNode, Layer } from '@core/blossom/types';
import type { VertexId } from '@core/graph/types';
import { invariant } from '@core/shared/invariant';
import { itemAt } from '@core/shared/itemAt';
import type { Point } from '../input/target';

/**
 * The layers (GDD §5.1, unlocked at 5.2): zooming into a folded flower to see what it folds, and
 * into the flowers nested inside it. Only the view changes: the garden, its rules and the moves
 * the level allows are the same at every depth, so the layers are a pure function of the garden,
 * the true places of its sprouts and the flowers entered.
 */

/** The flowers entered, by id, from the outermost in. Empty: outside, the garden as it is. */
export type LayerPath = readonly number[];

/** Outside every flower. */
export const OUTSIDE: LayerPath = [];

/** The most a layer enlarges the garden, so a flower of few petals is not blown up absurdly. */
export const MAX_ZOOM = 3;

/**
 * How a layer draws the garden: every point `p` is shown at `to + scale · (p − from)`. Outside it
 * is the identity; inside a flower, `from` is the centre of its petals and `to` the centre of the
 * garden.
 */
export interface LayerTransform {
  readonly scale: number;
  readonly from: Point;
  readonly to: Point;
}

const IDENTITY: LayerTransform = { scale: 1, from: { x: 0, y: 0 }, to: { x: 0, y: 0 } };

/** Where a layer shows the true point `p`. */
export const toScreen = (transform: LayerTransform, p: Point): Point => ({
  x: transform.to.x + transform.scale * (p.x - transform.from.x),
  y: transform.to.y + transform.scale * (p.y - transform.from.y),
});

/** Everything one layer shows. */
export interface LayerView {
  /** The flowers entered, after settling on the nearest layer that exists in this garden. */
  readonly path: LayerPath;
  /** The nodes seen: the garden on top outside, or the children of the innermost flower entered. */
  readonly nodes: readonly GardenNode[];
  /** Where every sprout is drawn (and touched) at this layer, hidden ones included. */
  readonly positions: readonly Point[];
  /** Which sprouts this layer shows: all outside, the petals of the flower entered inside. */
  readonly shown: readonly boolean[];
  /**
   * For each sprout, the index in `nodes` of the node that holds it, or −1 when it is not shown.
   * Two sprouts of one node are inside the same folded flower of this layer.
   */
  readonly groupOf: readonly number[];
  readonly transform: LayerTransform;
}

/** The flower with id `id` and the ids of the flowers around it, from the outermost; null if none. */
function ancestry(nodes: readonly GardenNode[], id: number): number[] | null {
  for (const node of nodes) {
    if (node.kind !== 'blossom') continue;
    if (node.id === id) return [id];
    const inside = ancestry(node.cycle, id);
    if (inside !== null) return [node.id, ...inside];
  }
  return null;
}

/**
 * The nearest layer to `path` that exists in the garden `layer`: the innermost flower entered that
 * is still folded, reached through the flowers that hold it now; outside if none is. So opening a
 * flower around the one being looked at keeps the view on it, and opening that one goes back out.
 */
export function settlePath(layer: Layer, path: LayerPath): LayerPath {
  for (let i = path.length - 1; i >= 0; i--) {
    const found = ancestry(layer.nodes, itemAt(path, i));
    if (found !== null) return found;
  }
  return OUTSIDE;
}

/** The nodes seen at a settled path: the garden on top, or the children of its last flower. */
function nodesAt(layer: Layer, path: LayerPath): readonly GardenNode[] {
  const nodes = nodesWithin(layer, path);
  invariant(nodes !== null, 'a settled path enters only flowers that are folded');
  return nodes;
}

/**
 * Enters the flower `blossom` if the layer at `path` shows it folded; any other flower, nested
 * deeper or not there, enters nothing. Flowers open from the outside in, and so are entered.
 */
export function enterFlower(layer: Layer, path: LayerPath, blossom: number): LayerPath {
  const settled = settlePath(layer, path);
  const entered = [...settled, blossom];
  return nodesWithin(layer, entered) === null ? settled : entered;
}

/** Leaves the innermost flower entered, back to the layer before; outside stays outside. */
export const leaveFlower = (path: LayerPath): LayerPath => path.slice(0, -1);

/** The box around some points: its centre and size. */
function box(points: readonly Point[]): { centre: Point; width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { centre: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, width: x1 - x0, height: y1 - y0 };
}

/**
 * The layer `path` leads to (settled on the nearest one that exists), with `positions` the true
 * places of the sprouts. Inside a flower, its petals are enlarged to fill the garden's own box,
 * centred in it, up to `MAX_ZOOM`; the same transform moves every sprout, so drawing the layer and
 * telling which sprout a touch lands on agree, and a touch always names a true sprout.
 */
export function layerView(layer: Layer, positions: readonly Point[], path: LayerPath): LayerView {
  const settled = settlePath(layer, path);
  const nodes = nodesAt(layer, settled);
  if (settled.length === 0) {
    return {
      path: settled,
      nodes,
      positions,
      shown: positions.map(() => true),
      groupOf: layer.nodeOf,
      transform: IDENTITY,
    };
  }
  const groupOf = positions.map(() => -1);
  nodes.forEach((node, index) => {
    for (const v of members(node)) groupOf[v] = index;
  });
  const shown = groupOf.map((group) => group !== -1);
  const garden = box(positions);
  const petals = box(positions.filter((_, v: VertexId) => shown[v]));
  // A side of no length (petals in a line) leaves the other side, or the cap, to decide.
  const fit = Math.min(garden.width / petals.width, garden.height / petals.height);
  const transform = {
    scale: Math.min(MAX_ZOOM, Math.max(1, fit)),
    from: petals.centre,
    to: garden.centre,
  };
  return {
    path: settled,
    nodes,
    positions: positions.map((p) => toScreen(transform, p)),
    shown,
    groupOf,
    transform,
  };
}
