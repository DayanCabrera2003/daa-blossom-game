import { baseVertex } from '../blossom/hierarchy';
import type { Layer } from '../blossom/types';
import type { VertexId } from '../graph/types';
import type { AlternatingForest } from '../search/forest';
import { itemAt } from '../shared/itemAt';

/**
 * The stones handed over by a failed search (level 7.4, Códex C12): every moon of the final forest,
 * as original sprouts in ascending order. Moons are always plain sprouts, since flowers are born
 * as suns, so each folded moon is exactly one sprout.
 *
 * Why the certificate closes: from a sun only moons can be reached (a sun–sun vine would have been a
 * chain or a flower, an unmarked sprout would have been marked), so lifting the moons isolates every
 * sun and every flower, each an odd group; the unreached sprouts pair up among themselves. Hence
 * odd(G − U) − |U| = #suns − #moons = #roots = sprouts in the dark, and the bound equals |M|.
 */
export function stonesFromForest(layer: Layer, forest: AlternatingForest): VertexId[] {
  const stones: VertexId[] = [];
  forest.label.forEach((label, id) => {
    if (label === 'inner') stones.push(baseVertex(itemAt(layer.nodes, id)));
  });
  return stones.sort((a, b) => a - b);
}
