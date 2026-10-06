import { hasEdge } from '../graph/queries';
import type { VertexId } from '../graph/types';
import { mateOf } from '../matching/queries';
import { invariant } from '../shared/invariant';
import { baseVertex } from './hierarchy';
import type { GardenNode, Layer } from './types';
import { walkToBase } from './walk';

/**
 * Lifts a chain of the folded garden `upper` (= `lower` with `blossom` folded) to a chain of
 * `lower`, opening that one flower (Códex C8, direction i; levels 4.5–4.7).
 *
 * At the flower the chain arrives by its lantern (which belongs to the base) and/or by a dark vine
 * (which may land on any petal). From the petal touching the dark vine there is exactly one way
 * around the loop to the base that alternates: start with that petal's lantern (`walkToBase`).
 * Inserting that walk turns the folded chain into an alternating one with the same dark ends.
 * Other folded nodes are just renamed to their ids in `lower`.
 */
export function liftPath(
  lower: Layer,
  upper: Layer,
  blossom: VertexId,
  path: readonly VertexId[],
): VertexId[] {
  const toLower = (id: VertexId): VertexId =>
    lower.nodeOf[baseVertex(upper.nodes[id] as GardenNode)] as VertexId;
  const at = path.indexOf(blossom);
  if (at === -1) return path.map(toLower);

  const flower = upper.nodes[blossom];
  invariant(flower?.kind === 'blossom', `node ${blossom} is not a flower`);
  const children = flower.cycle.map((child) => lower.nodeOf[baseVertex(child)] as VertexId);

  // The neighbor along a dark vine: whichever side of the flower is not its lantern partner.
  const partner = mateOf(upper.matching, blossom);
  const before = path[at - 1];
  const after = path[at + 1];
  const darkBefore = before !== undefined && before !== partner;
  const darkNeighbor = darkBefore ? before : after;
  invariant(darkNeighbor !== undefined && darkNeighbor !== partner, 'no dark vine at the flower');

  const entry = toLower(darkNeighbor);
  const petal = children.findIndex((child) => hasEdge(lower.graph, child, entry));
  const walk = walkToBase(children.length, petal).map((i) => children[i] as VertexId);
  const inside = darkBefore ? walk : walk.reverse();

  return [...path.slice(0, at).map(toLower), ...inside, ...path.slice(at + 1).map(toLower)];
}
