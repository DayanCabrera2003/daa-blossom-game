import type { VertexId } from '../graph/types';
import { itemAt } from '../shared/itemAt';
import type { GardenNode, Layer } from './types';

/** Every original sprout inside a node (itself, for a sprout), in ascending order. */
export function members(node: GardenNode): VertexId[] {
  const collected: VertexId[] = [];
  const collect = (current: GardenNode): void => {
    if (current.kind === 'sprout') collected.push(current.vertex);
    else for (const child of current.cycle) collect(child);
  };
  collect(node);
  return collected.sort((a, b) => a - b);
}

/**
 * The base sprout of a node: the only sprout whose lantern, if lit, leaves the node. For a flower
 * it is the base sprout of its base child, so it is found by descending through the bases.
 */
export function baseVertex(node: GardenNode): VertexId {
  let current = node;
  while (current.kind === 'blossom') current = itemAt(current.cycle, 0);
  return current.vertex;
}

/** The folded node holding sprout `v`: its outermost flower, or the sprout itself if unfolded. */
export function outermostNode(layer: Layer, v: VertexId): GardenNode {
  return itemAt(layer.nodes, itemAt(layer.nodeOf, v));
}

/**
 * How many flowers wrap sprout `v`, from the outermost down to the sprout (0 if it is not inside
 * any): the number of zoom steps the "Layers" view needs to reach it (level 5.2).
 */
export function nestingDepth(layer: Layer, v: VertexId): number {
  let depth = 0;
  let current = outermostNode(layer, v);
  while (current.kind === 'blossom') {
    depth++;
    current = current.cycle.find((child) => members(child).includes(v)) as GardenNode;
  }
  return depth;
}
