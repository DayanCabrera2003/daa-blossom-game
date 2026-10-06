import { unfoldLayer } from '../../blossom/unfold';
import type { TraceEvent } from '../../trace/events';
import type { Action } from '../actions';
import { accept, reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * Unfold (level 4.5): open a flower to trace the chain through it. Only a flower on top can be
 * opened, outer flowers before the ones inside them (5.2). The marks described the folded garden,
 * so they are wiped; a chain already seen is kept, since it names original sprouts.
 */
export function unfold(
  state: GardenState,
  { blossom }: Extract<Action, { type: 'unfold' }>,
): ActionOutcome {
  const id = state.layer.nodes.findIndex((node) => node.kind === 'blossom' && node.id === blossom);
  if (id === -1) return reject({ code: 'noSuchFlower', blossom });
  const events: TraceEvent[] = [{ type: 'expand', blossom }];
  if (state.search !== null) events.push({ type: 'searchCleared' });
  return accept({ ...state, layer: unfoldLayer(state.layer, id), search: null }, events);
}
