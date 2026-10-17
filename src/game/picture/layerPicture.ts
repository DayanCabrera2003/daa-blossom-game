import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { SproutKind } from '@levels/fields';
import { flowerPictures, gardenPicture, type GardenPicture, type PointingExtras } from './garden';
import type { LayerView } from './layers';

/**
 * The picture of the garden at one layer (5.2). Outside, it is the garden's own picture. Inside a
 * flower, the same picture drawn where the layer puts the sprouts, keeping only what the flower
 * folds: its petals, the vines between them (those inside a flower folded within it still belong
 * to that flower), and the flowers nested in it, outlined as if they were on top. Odd groups of
 * lifted stones span the whole garden, so they are left to the outside view.
 */
export function layerPicture(
  state: GardenState,
  view: LayerView,
  labels: readonly string[],
  extras: PointingExtras,
  kinds: readonly (SproutKind | undefined)[] = [],
): GardenPicture {
  const whole = gardenPicture(state, view.positions, labels, extras, kinds);
  if (view.path.length === 0) return whole;
  const shown = (v: VertexId): boolean => view.shown[v] === true;
  const group = (v: VertexId): number => itemAt(view.groupOf, v);
  return {
    ...whole,
    sprouts: whole.sprouts.filter((sprout) => shown(sprout.vertex)),
    vines: whole.vines
      .filter((vine) => shown(vine.u) && shown(vine.v))
      .map((vine) => ({ ...vine, inFlower: group(vine.u) === group(vine.v) })),
    flowers: flowerPictures(view.nodes, (v) => itemAt(view.positions, v)),
    oddGroups: [],
  };
}
