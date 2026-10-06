import { baseVertex } from '../blossom/hierarchy';
import type { Blossom, GardenNode } from '../blossom/types';
import type { NodeRef, TraceEvent } from './events';

/** A folded node named stably: an original sprout, or a flower by its id. */
const refOf = (node: GardenNode): NodeRef =>
  node.kind === 'sprout'
    ? { kind: 'sprout', vertex: node.vertex }
    : { kind: 'blossom', id: node.id };

/** The `contract` event describing a freshly folded flower, the same for algorithm and player. */
export function contractEvent(flower: Blossom): Extract<TraceEvent, { type: 'contract' }> {
  return {
    type: 'contract',
    blossom: flower.id,
    base: baseVertex(flower),
    cycle: flower.cycle.map(refOf),
  };
}
