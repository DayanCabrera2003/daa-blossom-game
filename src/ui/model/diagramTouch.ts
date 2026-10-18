import type { VertexId } from '@core/graph/types';
import { isExposed, isMatchedEdge } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import type { GardenState } from '@core/rules/state';
import type { DiagramMove } from './diagramSpec';

/**
 * What a touch on a small garden of the Codex asks the rules for (plan 07, phase 4). The gestures
 * are the game's own: with lanterns, a sprout in the dark is touched first, then a neighbour in the
 * dark (join) or a lit one (take its lantern), and a lit vine is touched to put it out; a chain,
 * which the game drags, is touched here sprout by sprout and then passed with a button. This module
 * never decides whether a move is valid: `applyAction` does, and its reason is what the page says.
 * A move the block does not allow makes nothing happen at all.
 */

/** What a touch lands on: a sprout, or a vine by its two sprouts. */
export type DiagramTarget =
  | { readonly kind: 'sprout'; readonly vertex: VertexId }
  | { readonly kind: 'vine'; readonly u: VertexId; readonly v: VertexId };

/** What a touch does: a move for the rules (or none yet), and the sprouts touched after it. */
export interface TouchOutcome {
  readonly action: Action | null;
  readonly touched: readonly VertexId[];
}

/** The move, if the block allows it, with nothing touched left. */
const act = (action: Action | null, moves: ReadonlySet<DiagramMove>): TouchOutcome => ({
  action: action !== null && moves.has(action.type as DiagramMove) ? action : null,
  touched: [],
});

/** A touch on a pair of sprouts with lanterns: the same as the game's lanterns tool. */
function pairTouch(
  state: GardenState,
  moves: ReadonlySet<DiagramMove>,
  touched: readonly VertexId[],
  vertex: VertexId,
): TouchOutcome {
  const first = touched[0];
  if (first === undefined) {
    return isExposed(state.matching, vertex)
      ? { action: null, touched: [vertex] }
      : act(null, moves);
  }
  if (vertex === first) return act(null, moves);
  return act(
    isExposed(state.matching, vertex)
      ? { type: 'join', u: first, v: vertex }
      : { type: 'passLantern', from: first, to: vertex },
    moves,
  );
}

/**
 * Turns a touch on `target` into a move, given the moves the block allows and the sprouts touched
 * before. Where chains are allowed, touching sprouts draws one (touching the last again takes it
 * back) and a dark vine leaves it be; elsewhere sprouts are touched in pairs, as in the game.
 */
export function touchDiagram(
  state: GardenState,
  moves: ReadonlySet<DiagramMove>,
  touched: readonly VertexId[],
  target: DiagramTarget,
): TouchOutcome {
  const chains = moves.has('chain');
  if (target.kind === 'vine') {
    if (isMatchedEdge(state.matching, target.u, target.v)) {
      return act({ type: 'split', u: target.u, v: target.v }, moves);
    }
    return chains ? { action: null, touched } : act(null, moves);
  }
  if (!chains) return pairTouch(state, moves, touched, target.vertex);
  return touched.at(-1) === target.vertex
    ? { action: null, touched: touched.slice(0, -1) }
    : { action: null, touched: [...touched, target.vertex] };
}

/** The chain drawn by the sprouts touched, once it has a vine and where chains are allowed. */
export function chainOf(
  touched: readonly VertexId[],
  moves: ReadonlySet<DiagramMove>,
): Action | null {
  return moves.has('chain') && touched.length >= 2 ? { type: 'chain', path: touched } : null;
}

/** The name a target carries in the picture: `s3` for sprout 3, `v1-2` for the vine 1–2. */
export const targetName = (target: DiagramTarget): string =>
  target.kind === 'sprout' ? `s${target.vertex}` : `v${target.u}-${target.v}`;

/** The target a picture's name stands for, or null for a name that is no target. */
export function targetOf(name: string): DiagramTarget | null {
  const sprout = /^s(\d+)$/.exec(name);
  if (sprout !== null) return { kind: 'sprout', vertex: Number(sprout[1]) };
  const vine = /^v(\d+)-(\d+)$/.exec(name);
  return vine === null ? null : { kind: 'vine', u: Number(vine[1]), v: Number(vine[2]) };
}
