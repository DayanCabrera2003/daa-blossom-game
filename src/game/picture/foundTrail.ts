import { members } from '@core/blossom/hierarchy';
import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import { centroid } from '../input/flowerShape';
import type { Point } from '../input/target';
import type { FoundChain } from '../systems/liftGaps';

/** A straight piece of the found trail, from one point to another. */
export type TrailSegment = readonly [Point, Point];

/**
 * The found stretches of the chain the light found, as drawn (GDD §5.1, "El gesto de levantar"):
 * a dotted gold trail from the moment the light finds the chain until the lanterns change. Every
 * vine of the chain outside its gaps is drawn; an end that a flower still folds is drawn at the
 * flower's middle, so while the flower is closed the trail passes through it, and once it is open
 * the gap inside is left undrawn for the player to fill. Inside a flower entered with the layers
 * (5.2) the trail is not drawn: the stretches lie outside the flower shown. Pure.
 */
export function foundTrailPicture(
  found: FoundChain | null,
  state: GardenState,
  positions: readonly Point[],
  insideLayer: boolean,
): TrailSegment[] {
  if (found === null || insideLayer) return [];
  const { layer } = state;
  // Where an end of a found vine is drawn: its sprout, or the middle of the flower folding it.
  const pointOf = (v: VertexId): Point => {
    const node = itemAt(layer.nodes, itemAt(layer.nodeOf, v));
    return node.kind === 'blossom'
      ? centroid(members(node).map((petal) => itemAt(positions, petal)))
      : itemAt(positions, v);
  };
  const inGap = (i: number): boolean => found.gaps.some((gap) => gap.from <= i && i < gap.to);
  const segments: TrailSegment[] = [];
  for (let i = 0; i + 1 < found.chain.length; i += 1) {
    if (inGap(i)) continue;
    const a = pointOf(itemAt(found.chain, i));
    const b = pointOf(itemAt(found.chain, i + 1));
    if (a.x !== b.x || a.y !== b.y) segments.push([a, b]);
  }
  return segments;
}
