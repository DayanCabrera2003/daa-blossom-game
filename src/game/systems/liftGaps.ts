import { members } from '@core/blossom/hierarchy';
import type { VertexId } from '@core/graph/types';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';

/**
 * A stretch of the found chain that ran inside a flower folded when the light found it: the
 * positions in the chain of its first and last sprouts (`from` < `to`). One per flower on top that
 * the chain crosses, since a chain crosses a flower in a single stretch (Códex C9, Proposition 9.4).
 */
export interface Gap {
  readonly from: number;
  readonly to: number;
  /**
   * Every sprout the flower folded, the petals of flowers nested in it among them: where a drag
   * into the gap may go, the wrong side of the flower included, so that it is refused with a reason.
   */
  readonly petals: readonly VertexId[];
}

/**
 * The chain the light found and what of it the search really saw (GDD §5.1, "El gesto de
 * levantar"): the **found stretches** are the chain outside the flowers folded at that moment; the
 * **gaps** are what ran inside them, which the player fills by dragging once the flowers are open.
 */
export interface FoundChain {
  /** The chain seen, on original sprouts, as the rules keep it (`chainSeen`). */
  readonly chain: readonly VertexId[];
  /** The stretches inside the flowers folded when it was found, in the chain's order. */
  readonly gaps: readonly Gap[];
}

/** Whether two chains are the same sprouts in the same order. */
const sameSprouts = (a: readonly VertexId[], b: readonly VertexId[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** The flower on top of `state`'s garden that folds sprout `v`, or null when `v` is on top itself. */
function flowerOf(state: GardenState, v: VertexId): number | null {
  const node = itemAt(state.layer.nodeOf, v);
  return itemAt(state.layer.nodes, node).kind === 'blossom' ? node : null;
}

/**
 * The stretches of `chain` inside the flowers folded in `state`: each run of two sprouts or more
 * that one flower on top folds. A single sprout of a flower (a chain touching it at its base only)
 * leaves nothing to fill.
 */
function gapsIn(state: GardenState, chain: readonly VertexId[]): Gap[] {
  const gaps: Gap[] = [];
  let from = 0;
  for (let i = 1; i <= chain.length; i += 1) {
    const flower = flowerOf(state, itemAt(chain, from));
    const sameRun =
      i < chain.length && flower !== null && flowerOf(state, itemAt(chain, i)) === flower;
    if (sameRun) continue;
    if (flower !== null && i - 1 > from) {
      gaps.push({ from, to: i - 1, petals: members(itemAt(state.layer.nodes, flower)) });
    }
    from = i;
  }
  return gaps;
}

/**
 * The chain the light found, shown at `cursor` of the day `states`, and its gaps; null while no
 * chain is seen, once the lanterns have changed, or where any chain may be lit (the gesture belongs
 * to the gardens where the lanterns only move where the light went: rule `seen`). The gaps are read
 * in the garden as it was when the chain was first seen, the earliest state of the day from which
 * the same chain stays seen up to the cursor: unfolding keeps the chain, so later states no longer
 * show the flowers it crossed.
 */
export function foundChain(states: readonly GardenState[], cursor: number): FoundChain | null {
  const now = itemAt(states, cursor);
  const chain = now.chainSeen;
  if (chain === null || now.chains.rule !== 'seen') return null;
  let found = cursor;
  while (found > 0) {
    const before = itemAt(states, found - 1).chainSeen;
    if (before === null || !sameSprouts(before, chain)) break;
    found -= 1;
  }
  return { chain, gaps: gapsIn(itemAt(states, found), chain) };
}

/** The sprouts of the gap `gap` of `chain`, in the chain's order. */
export const gapSprouts = (chain: readonly VertexId[], gap: Gap): readonly VertexId[] =>
  chain.slice(gap.from, gap.to + 1);

/**
 * Whether the gap `gap` of `chain` is open in `state`: every sprout of it is on top, no flower
 * still folding any of them, so its stretch can be dragged (5.1: the outer flower and then the one
 * inside it).
 */
export const gapOpen = (state: GardenState, chain: readonly VertexId[], gap: Gap): boolean =>
  gapSprouts(chain, gap).every((v) => flowerOf(state, v) === null);
