import { baseVertex, members } from '@core/blossom/hierarchy';
import type { GardenNode } from '@core/blossom/types';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { FlowerSnapshot, GardenSnapshot } from '@core/trace/replay';

/**
 * A garden of the rules seen as the core's replay sees a moment of a trace (`stateAt`): lanterns,
 * the mark of every sprout and the folded flowers, all on original sprouts. A diagram draws both
 * kinds of day, the moves of the rules and a traced run of the algorithm, from this one shape.
 * A sprout inside a folded flower wears the flower's mark, as `stateAt` marks every petal.
 */
export function snapshotOf(state: GardenState): GardenSnapshot {
  const { layer, search } = state;
  const label = layer.nodeOf.map((node) => (search === null ? 'none' : itemAt(search.label, node)));
  const flowers: FlowerSnapshot[] = [];
  const walk = (node: GardenNode, parent: number | null): void => {
    if (node.kind !== 'blossom') return;
    flowers.push({ id: node.id, base: baseVertex(node), members: members(node), parent });
    for (const child of node.cycle) walk(child, node.id);
  };
  for (const node of layer.nodes) walk(node, null);
  return {
    mate: state.matching.mate,
    label,
    flowers: flowers.sort((a, b) => a.id - b.id),
  };
}
