import type { VertexId } from '@core/graph/types';
import { isExposed, isMatchedEdge } from '@core/matching/queries';
import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';

/**
 * An exhaustive walk over every garden a level lets the player reach (plan 10, section 2.3): a
 * breadth-first search whose moves are generated here from the garden itself (every join, split and
 * pass, every chain along any simple alternating path, every mark, fold and unfold…) and judged by
 * the real rules (`applyAction`), so "the level cannot be won without the gesture" is a fact about
 * the rules, not about the reference solution.
 *
 * Moves that never change the lanterns, the marks or the flowers are left out, since they cannot
 * open a way the walk would otherwise miss: scarecrows, stones and "Terminé" (a goal that needs
 * "Terminé" is asked as if it were said). Fog is lifted at the start: it only ever refuses moves,
 * so whatever cannot be reached in the clear cannot be reached in the fog either.
 */

/** What the walk is asked to do. */
export interface ExploreOptions {
  /** Moves the player may not make in this walk (the gesture left out: `foldAt`…). */
  readonly without?: readonly ActionType[];
  /** Gardens the walk does not go beyond (e.g. the base in the dark, for 4.10). */
  readonly prune?: (state: GardenState) => boolean;
  /** The gardens looked for. */
  readonly goal: (state: GardenState) => boolean;
  /** A bound on the gardens visited, so a walk that grows too much fails loudly instead of hanging. */
  readonly limit?: number;
}

/** What the walk found: whether a goal was reached, how many gardens it saw, and how to get there. */
export interface Exploration {
  readonly reached: boolean;
  readonly visited: number;
  /** The moves to the first goal found (one of the shortest), or null. */
  readonly witness: readonly Action[] | null;
}

/** The parts of a garden the walked moves can change; equal keys are the same garden. */
const keyOf = (state: GardenState): string =>
  JSON.stringify([
    state.matching.mate,
    state.layer.nodeOf,
    state.layer.nodes,
    state.search,
    state.chainSeen,
  ]);

/**
 * Every simple alternating path from a sprout in the dark with at least one vine that ends either in
 * the dark (a chain that lights a lantern) or after a lit vine (a chain of gain 0): every chain the
 * player could drag.
 */
export function everyChain(state: GardenState): VertexId[][] {
  const { graph, matching } = state;
  const found: VertexId[][] = [];
  const extend = (path: VertexId[]): void => {
    const last = path[path.length - 1] as VertexId;
    if (path.length > 1 && (path.length % 2 === 1 || isExposed(matching, last))) {
      found.push(path);
    }
    // Vines alternate dark, lit, dark…: the next one is lit exactly when the path has an even
    // number of sprouts.
    const nextLit = path.length % 2 === 0;
    for (const next of graph.adjacency[last] ?? []) {
      if (path.includes(next) || isMatchedEdge(matching, last, next) !== nextLit) continue;
      extend([...path, next]);
    }
  };
  for (let v = 0; v < graph.n; v++) if (isExposed(matching, v)) extend([v]);
  return found;
}

/** Every move worth trying in a garden, before the rules judge it. */
function candidates(state: GardenState): Action[] {
  const moves: Action[] = [];
  for (const [u, v] of state.graph.edges) {
    moves.push({ type: 'join', u, v }, { type: 'split', u, v }, { type: 'foldAt', from: u, to: v });
    for (const [from, to] of [
      [u, v],
      [v, u],
    ] as const) {
      moves.push({ type: 'passLantern', from, to }, { type: 'markMoon', from, to });
    }
  }
  for (let vertex = 0; vertex < state.graph.n; vertex++) moves.push({ type: 'markRoot', vertex });
  for (const path of everyChain(state)) {
    moves.push({ type: 'chain', path });
    if (path.length % 2 === 1 && !isExposed(state.matching, path[path.length - 1] as VertexId)) {
      moves.push({ type: 'rotateStem', stem: path });
    }
  }
  for (const node of state.layer.nodes) {
    if (node.kind === 'blossom') moves.push({ type: 'unfold', blossom: node.id });
  }
  return moves;
}

/** Walks every garden reachable from `start` with the moves the level allows. */
export function explore(start: GardenState, options: ExploreOptions): Exploration {
  const without = new Set(options.without ?? []);
  const limit = options.limit ?? 200_000;
  const clear: GardenState = {
    ...start,
    revealed: start.revealed === null ? null : start.revealed.map(() => true),
  };
  const seen = new Map<string, readonly Action[]>([[keyOf(clear), []]]);
  let frontier: { state: GardenState; moves: readonly Action[] }[] = [{ state: clear, moves: [] }];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { state, moves } of frontier) {
      if (options.goal(state)) return { reached: true, visited: seen.size, witness: moves };
      if (options.prune?.(state) === true) continue;
      for (const move of candidates(state)) {
        if (without.has(move.type) || !state.allowed.has(move.type)) continue;
        const outcome = applyAction(state, move);
        if (!outcome.ok) continue;
        const key = keyOf(outcome.state);
        if (seen.has(key)) continue;
        const path = [...moves, move];
        seen.set(key, path);
        if (seen.size > limit) throw new Error(`the walk passed ${limit} gardens`);
        next.push({ state: outcome.state, moves: path });
      }
    }
    frontier = next;
  }
  return { reached: false, visited: seen.size, witness: null };
}
