import type { VertexId } from '../graph/types';
import { mateOf } from '../matching/queries';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import { members } from './hierarchy';
import type { Blossom, GardenNode, Layer } from './types';
import { vineBetween } from './vineBetween';
import { walkToBase } from './walk';

/**
 * The sprouts from sprout `x` inside `node` to the node's base sprout, along an even alternating
 * path that starts with x's lantern (Códex C9). In a flower, the walk goes around the loop from
 * the child holding `x` (`walkToBase`); every child on the way is crossed recursively:
 * - children at even steps are entered on a dark vine (or hold `x`) and left by their lantern,
 *   which belongs to their base: recurse from the entry sprout to the base;
 * - children at odd steps are entered by their lantern, at the base, and left on the dark vine
 *   to the next child: recurse from the exit sprout and read the result backwards.
 * Nested flowers are thus opened from the outside in, each by the only side that alternates.
 */
function pathToBase(node: GardenNode, x: VertexId): VertexId[] {
  if (node.kind === 'sprout') {
    invariant(node.vertex === x, `sprout ${x} is not ${node.vertex}`);
    return [x];
  }
  const holder = node.cycle.findIndex((child) => members(child).includes(x));
  invariant(holder !== -1, `sprout ${x} is not inside flower ${node.id}`);
  const walk = walkToBase(node.cycle.length, holder);

  const path: VertexId[] = [];
  let entry = x;
  walk.forEach((index, step) => {
    const child = itemAt(node.cycle, index);
    if (step % 2 === 0) {
      path.push(...pathToBase(child, entry));
      return;
    }
    const [exit, nextEntry] = vineTowards(node, index, walk[step + 1] as number);
    path.push(...pathToBase(child, exit).reverse());
    entry = nextEntry;
  });
  return path;
}

/** The loop vine from child `from` to the adjacent child `to`, as [sprout in from, sprout in to]. */
function vineTowards(node: Blossom, from: number, to: number): [VertexId, VertexId] {
  const forward = (from + 1) % node.cycle.length === to;
  const [a, b] = node.edges[forward ? from : to] as readonly [VertexId, VertexId];
  return forward ? [a, b] : [b, a];
}

/**
 * Unfolds a chain of a folded garden all the way down to the original sprouts. Consecutive folded
 * nodes are joined through `vineBetween`; inside each node the chain runs between the sprout where
 * its dark vine lands and the base, whose lantern (if any) is the chain's other vine there.
 */
export function expandPath(layer: Layer, path: readonly VertexId[]): VertexId[] {
  const vines = path.slice(1).map((next, i) => vineBetween(layer, itemAt(path, i), next));
  const expanded: VertexId[] = [];
  path.forEach((id, i) => {
    const node = itemAt(layer.nodes, id);
    const partner = mateOf(layer.matching, id);
    const before = path[i - 1];
    // The dark vine at this node lands on `landing`; the lantern side, if any, is the base.
    if (before !== undefined && before !== partner) {
      expanded.push(...pathToBase(node, itemAt(vines, i - 1)[1]));
    } else {
      const [landing] = itemAt(vines, i);
      expanded.push(...pathToBase(node, landing).reverse());
    }
  });
  return expanded;
}
