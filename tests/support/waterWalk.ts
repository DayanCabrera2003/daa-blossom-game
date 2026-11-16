import { maximumSize } from '@core/edmonds/fast/maximum';
import { createGraph } from '@core/graph/createGraph';
import type { VertexId } from '@core/graph/types';
import type { Action, ActionType } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import { unwrap } from '@core/shared/result';
import { candidates, keyOf } from './gardenExplorer';

/**
 * The fewest drops a fog level can be won with (GDD §7, chapter 3, «Las gotas»): the exhaustive
 * walk of `gardenExplorer`, kept in the fog, where an inspection costs one drop and every other move
 * is free. The walk goes drop by drop: every garden reachable with no more inspections than the
 * current count is visited before one more sprout is inspected, so the first goal met is met with
 * the fewest drops (or, with `after`, the walk goes on until no garden with more drops could do
 * better).
 *
 * Only sprouts with a sun on them (or on the flower holding them) are inspected. That leaves no win
 * out: an inspection only ever lifts the refusal of a move along a hidden vine, and the moves that
 * need one are a look from a sun (a mark by hand or the light's) and a lighting along vines in
 * sight; with the chain rule of these levels (`seen`), a lighting runs along the chain the marks
 * reached, whose every vine has a sun at one end that already looked from it. Inspecting a sprout
 * before it is a sun costs the same drop as inspecting it after.
 */

/** What the walk is asked to do. */
export interface WaterOptions {
  /** The gardens looked for. */
  readonly goal: (state: GardenState) => boolean;
  /** Moves left out of this walk (those that move lanterns, where they cannot save a drop). */
  readonly without?: readonly ActionType[];
  /**
   * The drops a garden met as a goal still needs once there (a certificate to check the vines the
   * fog hides); none by default. The walk goes on while fewer drops could still beat the best.
   */
  readonly after?: (state: GardenState) => number;
  /** A bound on the gardens visited, so a walk that grows too much fails loudly. */
  readonly limit?: number;
}

/** What the walk found: the fewest drops that reach a goal (null: none does), and how. */
export interface WaterWalk {
  readonly drops: number | null;
  readonly visited: number;
  readonly witness: readonly Action[] | null;
}

/** A garden as the walk keeps it: the garden, its fog and the moves to it. */
interface Visit {
  readonly state: GardenState;
  readonly moves: readonly Action[];
}

/** The parts of a garden the walk can change, its fog among them. */
const fogKeyOf = (state: GardenState): string =>
  `${keyOf(state)}|${(state.revealed ?? []).map((seen) => (seen ? 1 : 0)).join('')}`;

/** The sprouts still covered whose node carries a sun: the only ones worth a drop. */
function sunsInTheFog(state: GardenState): VertexId[] {
  const { revealed, search, layer } = state;
  if (revealed === null || search === null) return [];
  return revealed.flatMap((seen, v) =>
    !seen && search.label[itemAt(layer.nodeOf, v)] === 'outer' ? [v] : [],
  );
}

/** Walks every garden reachable from `start`, in the fog, drop by drop. */
export function fewestDrops(start: GardenState, options: WaterOptions): WaterWalk {
  const limit = options.limit ?? 400_000;
  const without = new Set(options.without ?? []);
  const seen = new Set<string>([fogKeyOf(start)]);
  const remember = (state: GardenState): boolean => {
    const key = fogKeyOf(state);
    if (seen.has(key)) return false;
    seen.add(key);
    if (seen.size > limit) throw new Error(`the walk passed ${limit} gardens`);
    return true;
  };

  let best: { drops: number; witness: readonly Action[] } | null = null;
  let layer: Visit[] = [{ state: start, moves: [] }];
  for (let drops = 0; layer.length > 0 && (best === null || drops < best.drops); drops++) {
    // Every garden reachable with these drops, without inspecting anything more.
    const reached: Visit[] = [];
    for (let frontier = layer; frontier.length > 0;) {
      const next: Visit[] = [];
      for (const visit of frontier) {
        if (options.goal(visit.state)) {
          const total = drops + (options.after?.(visit.state) ?? 0);
          if (best === null || total < best.drops) best = { drops: total, witness: visit.moves };
          if (options.after === undefined) return { ...best, visited: seen.size };
        }
        reached.push(visit);
        for (const move of candidates(visit.state)) {
          if (without.has(move.type) || !visit.state.allowed.has(move.type)) continue;
          const outcome = applyAction(visit.state, move);
          if (outcome.ok && remember(outcome.state)) {
            next.push({ state: outcome.state, moves: [...visit.moves, move] });
          }
        }
      }
      frontier = next;
    }
    // One drop more: a sun still covered, inspected.
    layer = [];
    for (const visit of reached) {
      for (const vertex of sunsInTheFog(visit.state)) {
        const move: Action = { type: 'inspect', vertex };
        const outcome = applyAction(visit.state, move);
        if (outcome.ok && remember(outcome.state)) {
          layer.push({ state: outcome.state, moves: [...visit.moves, move] });
        }
      }
    }
  }
  return best === null
    ? { drops: null, visited: seen.size, witness: null }
    : { ...best, visited: seen.size };
}

/**
 * The fewest inspections that bring every vine of the garden in sight, an end of each inspected:
 * what presenting a certificate of scarecrows asks of the fog, since nobody can vouch for a vine
 * they cannot see. It is the smallest set of sprouts touching every hidden vine, which in a garden
 * of bees and clovers (chapter 3) is as large as the most lanterns those vines hold (König).
 */
export function toSeeEveryVine(state: GardenState): number {
  const { revealed } = state;
  if (revealed === null) return 0;
  const hidden = state.graph.edges.filter(([u, v]) => !revealed[u] && !revealed[v]);
  return maximumSize(unwrap(createGraph(state.graph.n, hidden)));
}
