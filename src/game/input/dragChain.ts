import type { VertexId } from '@core/graph/types';
import { checkAlternatingPath, checkAugmentingPath, checkStem } from '@core/matching/paths';
import { isExposed } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';

/** The chain being dragged after one more move, and why that move was refused, if it was. */
export interface DragStep {
  readonly path: readonly VertexId[];
  readonly rejection: RejectReason | null;
}

/** Starts a chain on a sprout; only a sprout in the dark can start one (GDD 1.3). */
export function startChain(state: GardenState, vertex: VertexId): DragStep {
  if (!isExposed(state.matching, vertex)) {
    return {
      path: [],
      rejection: { code: 'invalidPath', error: { code: 'endpointNotExposed', vertex } },
    };
  }
  return { path: [vertex], rejection: null };
}

/**
 * Moves the dragged chain onto `vertex`. Going back over the last step takes it back; any other
 * move is checked with the core's own alternation rule, and a wrong one is refused with its reason
 * (shown to the player: "Cleo already has a lantern…", GDD 4.5) while the chain stays put.
 */
export function extendChain(
  state: GardenState,
  path: readonly VertexId[],
  vertex: VertexId,
): DragStep {
  if (path.length === 0 || vertex === path[path.length - 1]) return { path, rejection: null };
  if (vertex === path[path.length - 2]) return { path: path.slice(0, -1), rejection: null };
  const candidate = [...path, vertex];
  const checked = checkAlternatingPath(state.graph, state.matching, candidate);
  if (!checked.ok) return { path, rejection: { code: 'invalidPath', error: checked.error } };
  return { path: candidate, rejection: null };
}

/** What letting go would give: +1 lantern, 0 (the darkness only moves), or null (not legal). */
export function chainGain(state: GardenState, path: readonly VertexId[]): 1 | 0 | null {
  if (path.length < 2) return null;
  if (checkAugmentingPath(state.graph, state.matching, path).ok) return 1;
  if (checkStem(state.graph, state.matching, path).ok) return 0;
  return null;
}

/**
 * The action of letting go. A chain of gain 0 is "a chain of gain 0, now with a name" (4.10): it
 * becomes `rotateStem` where that move is unlocked. A chain the rules will refuse is still sent,
 * so the player reads why; a single sprout is just a touch.
 */
export function finishChain(state: GardenState, path: readonly VertexId[]): Action | null {
  if (path.length < 2) return null;
  const gainsNothing = chainGain(state, path) === 0;
  if (gainsNothing && state.allowed.has('rotateStem')) return { type: 'rotateStem', stem: path };
  return { type: 'chain', path };
}
