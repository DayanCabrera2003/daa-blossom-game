import type { Graph, VertexId } from '../graph/types';
import { checkAugmentingPath } from '../matching/paths';
import { isExposed } from '../matching/queries';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import { contract, openLayer } from './contract';
import type { Layer } from './types';

/**
 * The flower lemma, hard direction (Códex C8, level 4.11): with the base of a flower in the dark,
 * every chain of the open garden leaves a stretch that is a chain of the folded garden. So folding
 * never hides a chain.
 */
export interface FlowerCut {
  /** The chain, turned round if needed so that it starts at an end outside the flower. */
  readonly chain: readonly VertexId[];
  /**
   * The start of `chain` up to the first petal it touches, that petal included; the whole chain
   * when it never touches the flower.
   */
  readonly stretch: readonly VertexId[];
  /** The first petal the chain touches from its outside end; null when it touches none. */
  readonly petal: VertexId | null;
  /** The folded garden: G/B and M/B. */
  readonly folded: Layer;
  /** The flower as one node of the folded garden. */
  readonly flowerNode: VertexId;
  /** `stretch` in the ids of the folded garden: a chain there, ending at the flower if it reaches it. */
  readonly projected: readonly VertexId[];
}

/**
 * Cuts a chain of the open garden at a flower whose base is in the dark (bugs otherwise: callers
 * check the chain with `checkAugmentingPath`, and level integrity checks the flower).
 *
 * Why the stretch is a chain of the folded garden: both ends of the chain are in the dark, and
 * inside the flower only the base is, so at least one end lies outside; the chain starts there. Up
 * to the first petal it alternates and touches no petal, so folding leaves it as it was, and its
 * lanterns are lanterns of M/B. It reaches the petal by a dark vine: a lit one would be the petal's
 * lantern leaving the flower, which only the base may have, and the base has none. The folded
 * flower keeps the base's darkness, so the stretch ends in the dark: a chain. A chain that never
 * touches the flower is a chain of the folded garden as it is.
 */
export function cutAtFlower(
  graph: Graph,
  matching: Matching,
  flower: readonly VertexId[],
  chain: readonly VertexId[],
): FlowerCut {
  invariant(
    checkAugmentingPath(graph, matching, chain).ok,
    `not a chain of the open garden: ${chain.join(', ')}`,
  );
  const { layer: folded, blossom: flowerNode } = contract(openLayer(graph, matching), flower);
  const base = itemAt(flower, 0);
  invariant(isExposed(matching, base), `the base ${base} of the flower holds a lantern`);

  const petals = new Set(flower);
  const turned = petals.has(itemAt(chain, 0)) ? [...chain].reverse() : [...chain];
  const reached = turned.findIndex((v) => petals.has(v));
  const stretch = reached === -1 ? turned : turned.slice(0, reached + 1);
  return {
    chain: turned,
    stretch,
    petal: reached === -1 ? null : itemAt(turned, reached),
    folded,
    flowerNode,
    projected: stretch.map((v) => itemAt(folded.nodeOf, v)),
  };
}
