import { openLayer } from '../blossom/contract';
import type { Matching } from '../matching/types';
import type { TraceEvent } from '../trace/events';
import { accept, type ActionOutcome } from './outcome';
import type { GardenState } from './state';

/**
 * Accepts a move that changed the lanterns (join, split, a chain…). Marks describe a search for a
 * given set of lanterns, so a search in progress and the chain it saw are wiped, and the player is
 * told so with `searchCleared`. Moves that change lanterns only happen in the open garden.
 */
export function relight(
  state: GardenState,
  matching: Matching,
  events: readonly TraceEvent[],
): ActionOutcome {
  const wasSearching = state.search !== null || state.chainSeen !== null;
  return accept(
    {
      ...state,
      matching,
      layer: openLayer(state.graph, matching),
      search: null,
      chainSeen: null,
    },
    wasSearching ? [...events, { type: 'searchCleared' }] : events,
  );
}
