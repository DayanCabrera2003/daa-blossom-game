import type { GardenState } from '@core/rules/state';
import { hitTest } from '../input/HitTest';
import type { Point } from '../input/target';
import { enterFlower, type LayerPath, type LayerView } from '../picture/layers';

/**
 * A touch of the layers tool at `point` on the layer `view` of `state` (5.2): a folded flower the
 * layer shows is entered; anything else leaves the flowers entered as they were.
 */
export function touchLayers(state: GardenState, view: LayerView, point: Point): LayerPath {
  const target = hitTest(state, view.positions, point, view);
  return target.kind === 'flower' ? enterFlower(state.layer, view.path, target.blossom) : view.path;
}
