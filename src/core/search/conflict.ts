import { findOddCycle } from '../blossom/detect';
import { members } from '../blossom/hierarchy';
import type { Layer } from '../blossom/types';
import { vineBetween } from '../blossom/vineBetween';
import type { Edge, VertexId } from '../graph/types';
import { itemAt } from '../shared/itemAt';
import type { AlternatingForest } from './forest';

/**
 * The conflict of a search (levels 4.1, 4.2): a dark vine between two suns of the same tree, where
 * the light "went wrong", and the odd loop it closes.
 */
export interface Conflict {
  /** The original vine where the two suns meet, its ends in ascending order. */
  readonly vine: Edge;
  /** The loop it closes, as nodes of the layer, base first (`findOddCycle`). */
  readonly loop: readonly VertexId[];
  /**
   * How many original sprouts the loop holds; a folded flower on it counts with all its petals.
   * Always odd: an odd number of nodes, each holding an odd number of sprouts.
   */
  readonly sprouts: number;
}

/** Whether two nodes of the layer are both suns hanging from the same root. */
const sunsOfOneTree = (forest: AlternatingForest, a: VertexId, b: VertexId): boolean =>
  a !== b &&
  forest.label[a] === 'outer' &&
  forest.label[b] === 'outer' &&
  forest.root[a] === forest.root[b];

/**
 * Whether the original vine u–v is a conflict of the search `forest` (on the nodes of `layer`; null
 * before the first mark): its ends lie in two different nodes that are suns of one tree. Such a vine
 * is always dark: a sun's lantern, if any, goes to its parent, a moon. A vine inside a folded flower
 * joins a node to itself and is no conflict; two suns of different trees make a chain (3.4).
 */
export function isConflictVine(
  layer: Layer,
  forest: AlternatingForest | null,
  u: VertexId,
  v: VertexId,
): boolean {
  return forest !== null && sunsOfOneTree(forest, itemAt(layer.nodeOf, u), itemAt(layer.nodeOf, v));
}

/**
 * The first conflict of the player's search `forest` in the garden `layer` (in the order of the
 * layer's vines), or null when there is none. Such a vine is dark (see `isConflictVine`). The
 * loop is the flower that folding at that vine would close; the levels that ask about it (4.2)
 * have a single conflict.
 */
export function findConflict(layer: Layer, forest: AlternatingForest | null): Conflict | null {
  if (forest === null) return null;
  for (const [a, b] of layer.graph.edges) {
    if (!sunsOfOneTree(forest, a, b)) continue;
    const loop = findOddCycle(forest, a, b);
    const [u, v] = vineBetween(layer, a, b);
    const sprouts = loop.reduce(
      (total, node) => total + members(itemAt(layer.nodes, node)).length,
      0,
    );
    return { vine: u < v ? [u, v] : [v, u], loop, sprouts };
  }
  return null;
}
