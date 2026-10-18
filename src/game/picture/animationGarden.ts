import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { Point } from '../input/target';
import { current, type History } from '../systems/history';
import { foldShapes, type FoldShape } from './foldShape';
import { oddGroupPictures } from './garden';
import type { LayerView } from './layers';

/**
 * What the animation of a move draws on, besides its steps: where the sprouts stand at the layer
 * shown, the shape of each flower it may fold or open, and the odd groups the stones leave. A fold
 * finds its flower in the garden after the move, an unfold in the garden before it, so both are
 * read from the day's history (the move has just been pushed onto it).
 */
export interface AnimationGarden {
  readonly positions: readonly Point[];
  readonly flowers: ReadonlyMap<number, FoldShape>;
  /** The outlines of the odd groups after the move; none inside a flower (5.2). */
  readonly groups: readonly (readonly Point[])[];
}

/** The garden the animation of the move that led to the state shown in `history` draws on. */
export function animationGarden(
  history: History<GardenState>,
  view: Pick<LayerView, 'positions' | 'path'>,
): AnimationGarden {
  const now = current(history);
  const before = itemAt(history.states, Math.max(0, history.cursor - 1));
  const at = (v: number): Point => itemAt(view.positions, v);
  return {
    positions: view.positions,
    flowers: foldShapes([now.layer.nodes, before.layer.nodes], at),
    groups: view.path.length === 0 ? oddGroupPictures(now, at) : [],
  };
}
