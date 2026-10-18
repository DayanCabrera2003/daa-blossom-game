import { openLayer } from '../blossom/contract';
import type { GardenNode } from '../blossom/types';
import type { Matching } from '../matching/types';
import type { TraceEvent } from '../trace/events';
import { accept, type ActionOutcome } from './outcome';
import type { GardenState } from './state';

/**
 * Accepts a move that changed the lanterns (join, split, a chain…). Marks describe a search for a
 * given set of lanterns, so a search in progress and the chain it saw are wiped, and the player is
 * told so with `searchCleared`. Moves that change lanterns leave the garden open: a chain may pass
 * beside folded flowers (4.8), and they open after it with an `expand` each, so a day told by its
 * events (`stateAt`) ends with the very garden the rules leave.
 */
export function relight(
  state: GardenState,
  matching: Matching,
  events: readonly TraceEvent[],
): ActionOutcome {
  const wasSearching = state.search !== null || state.chainSeen !== null;
  const opened = foldedFlowers(state.layer.nodes).map((blossom): TraceEvent => ({
    type: 'expand',
    blossom,
  }));
  return accept(
    {
      ...state,
      matching,
      layer: openLayer(state.graph, matching),
      search: null,
      chainSeen: null,
    },
    [...events, ...opened, ...(wasSearching ? [{ type: 'searchCleared' } as const] : [])],
  );
}

/** The flowers folded among `nodes`, outermost first, each followed by those folded inside it. */
function foldedFlowers(nodes: readonly GardenNode[]): number[] {
  return nodes.flatMap((node) =>
    node.kind === 'blossom' ? [node.id, ...foldedFlowers(node.cycle)] : [],
  );
}
