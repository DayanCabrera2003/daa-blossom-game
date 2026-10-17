import type { VertexId } from '../graph/types';
import { itemAt } from '../shared/itemAt';
import type { RejectReason } from './reasons';
import type { GardenState } from './state';

/** The first given sprout that is not in the garden, as a rejection; null if all are. */
export function requireSprouts(
  state: GardenState,
  vertices: readonly number[],
): RejectReason | null {
  const unknown = vertices.find((v) => !Number.isInteger(v) || v < 0 || v >= state.graph.n);
  return unknown === undefined ? null : { code: 'vertexOutOfRange', vertex: unknown };
}

/**
 * Lanterns only move in the open garden: inside a folded flower they are part of its structure
 * (level 4.5, "to pass the lanterns you have to open the flower"). Null if nothing is folded.
 */
export function requireOpenGarden(state: GardenState): RejectReason | null {
  return state.layer.nodes.length === state.graph.n ? null : { code: 'flowersFolded' };
}

/**
 * Lanterns slide along a chain only outside closed flowers: a chain through a flower needs that
 * flower opened first (4.5), while flowers folded elsewhere do not stand in its way (4.8). The
 * rejection if some given sprout sits inside a folded flower; null otherwise.
 */
export function requireUnfolded(
  state: GardenState,
  vertices: readonly VertexId[],
): RejectReason | null {
  const { layer } = state;
  const folded = vertices.some(
    (v) => itemAt(layer.nodes, itemAt(layer.nodeOf, v)).kind === 'blossom',
  );
  return folded ? { code: 'flowersFolded' } : null;
}
