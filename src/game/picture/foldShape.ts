import { members } from '@core/blossom/hierarchy';
import type { GardenNode } from '@core/blossom/types';
import type { VertexId } from '@core/graph/types';
import { centroid } from '../input/flowerShape';
import type { Point } from '../input/target';

/**
 * What a flower folds from and into (GDD §4.1, key animation 2): each child of its cycle stands at
 * the middle of its own sprouts (a flower nested in the cycle moves as one), and they all close on
 * the middle of the flower's sprouts, where its petals are drawn (`garden.ts`). The frames between
 * come from `foldFrames.ts`.
 */

/** The children of a flower's cycle where they stand open, the flower's middle, its petals. */
export interface FoldShape {
  readonly open: readonly Point[];
  readonly centre: Point;
  readonly petals: number;
}

/**
 * The shape of every flower in `gardens` (nested ones too), by id, its sprouts drawn at `at`. A
 * fold needs the garden after it and an unfold the garden before, so both may be given: the first
 * garden that holds a flower names its shape.
 */
export function foldShapes(
  gardens: readonly (readonly GardenNode[])[],
  at: (v: VertexId) => Point,
): ReadonlyMap<number, FoldShape> {
  const shapes = new Map<number, FoldShape>();
  const middle = (node: GardenNode): Point => centroid(members(node).map(at));
  const walk = (node: GardenNode): void => {
    if (node.kind !== 'blossom') return;
    if (!shapes.has(node.id))
      shapes.set(node.id, {
        open: node.cycle.map(middle),
        centre: middle(node),
        petals: node.cycle.length,
      });
    node.cycle.forEach(walk);
  };
  for (const nodes of gardens) nodes.forEach(walk);
  return shapes;
}
