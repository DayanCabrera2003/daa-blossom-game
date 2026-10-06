import type { VertexId } from '../graph/types';
import type { GardenNode } from './types';

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
  while (current.kind === 'blossom') current = current.cycle[0] as GardenNode;
  return current.vertex;
}
