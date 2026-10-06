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
