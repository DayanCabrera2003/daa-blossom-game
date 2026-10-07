import type { VertexId } from '@core/graph/types';
import { isExposed, isMatchedEdge } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import { extendLoop } from './loopSelection';
import { NO_SELECTION, type Selection } from './selection';
import type { Target } from './target';
import type { ToolId } from './tools';

/** What one touch does: an action for the rules (or none yet) and the selection after it. */
export interface TapOutcome {
  readonly action: Action | null;
  readonly selection: Selection;
}

const act = (action: Action | null): TapOutcome => ({ action, selection: NO_SELECTION });
const hold = (selection: Selection): TapOutcome => ({ action: null, selection });

/** Whether the sprout belongs to a sun of the player's search (itself, or the flower holding it). */
const isSun = (state: GardenState, v: VertexId): boolean =>
  state.search?.label[itemAt(state.layer.nodeOf, v)] === 'outer';

/**
 * Lanterns (GDD §5.1, 0.1–1.1): touching a lit vine puts it out; a sprout in the dark is touched
 * first, then a neighbor in the dark (join) or a lit neighbor (pass the lantern). Doubtful pairs
 * still become actions, so the rules answer with a gentle reason instead of silence.
 */
function lanterns(state: GardenState, selection: Selection, target: Target): TapOutcome {
  if (target.kind === 'vine') {
    const lit = isMatchedEdge(state.matching, target.u, target.v);
    return act(lit ? { type: 'split', u: target.u, v: target.v } : null);
  }
  if (target.kind !== 'sprout') return act(null);
  const touched = target.vertex;
  if (selection.kind !== 'sprout') {
    return isExposed(state.matching, touched)
      ? hold({ kind: 'sprout', vertex: touched })
      : act(null);
  }
  const first = selection.vertex;
  if (touched === first) return act(null);
  return act(
    isExposed(state.matching, touched)
      ? { type: 'join', u: first, v: touched }
      : { type: 'passLantern', from: first, to: touched },
  );
}

/**
 * Marks (3.1–4.5): with a sun selected, touching any other sprout looks at it (a moon, a lonely
 * sprout closing a chain, or a sun the rules will call out); without one, a sun is selected and
 * any other sprout is offered a root sun. A vine folds where two suns meet; a flower opens.
 */
function marks(state: GardenState, selection: Selection, target: Target): TapOutcome {
  switch (target.kind) {
    case 'vine':
      return act({ type: 'foldAt', from: target.u, to: target.v });
    case 'flower':
      return act({ type: 'unfold', blossom: target.blossom });
    case 'nothing':
      return act(null);
    case 'sprout': {
      const touched = target.vertex;
      if (selection.kind === 'sprout') {
        if (touched === selection.vertex) return act(null);
        return act({ type: 'markMoon', from: selection.vertex, to: touched });
      }
      if (isSun(state, touched)) return hold({ kind: 'sprout', vertex: touched });
      return act({ type: 'markRoot', vertex: touched });
    }
  }
}

/** Fold a chosen loop (4.4): sprouts in order, closing on the first; elsewhere lets go. */
function foldLoop(selection: Selection, target: Target): TapOutcome {
  if (target.kind !== 'sprout') return act(null);
  const sofar = selection.kind === 'loop' ? selection.vertices : [];
  const step = extendLoop(sofar, target.vertex);
  if (step.closed !== null) return act({ type: 'fold', loop: step.closed });
  return hold(step.vertices.length > 0 ? { kind: 'loop', vertices: step.vertices } : NO_SELECTION);
}

/**
 * Turns one touch into an action of the rules, given the tool in hand and what was selected
 * before. It never decides whether the action is valid: that is the reducer's job, and its reason
 * is what the player reads. Tools that act on a single sprout toggle what is on it.
 */
export function resolveTap(
  state: GardenState,
  tool: ToolId,
  selection: Selection,
  target: Target,
): TapOutcome {
  switch (tool) {
    case 'lanterns':
      return lanterns(state, selection, target);
    case 'marks':
      return marks(state, selection, target);
    case 'foldLoop':
      return foldLoop(selection, target);
    case 'inspect':
      return act(target.kind === 'sprout' ? { type: 'inspect', vertex: target.vertex } : null);
    case 'scarecrows': {
      if (target.kind !== 'sprout') return act(null);
      const vertex = target.vertex;
      return act(
        state.scarecrows.includes(vertex)
          ? { type: 'removeScarecrow', vertex }
          : { type: 'placeScarecrow', vertex },
      );
    }
    case 'stones': {
      if (target.kind !== 'sprout') return act(null);
      const vertex = target.vertex;
      return act(
        state.stones.includes(vertex)
          ? { type: 'dropStone', vertex }
          : { type: 'liftStone', vertex },
      );
    }
  }
}
