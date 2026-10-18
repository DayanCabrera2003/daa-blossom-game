import type { VertexId } from '../graph/types';
import { isExposed } from '../matching/queries';
import type { RejectReason } from './reasons';
import type { GardenState } from './state';

/**
 * Which chains a level lets the lanterns slide along (plan 10, section 2; GDD §5.1), written in the
 * level file as `chains` and enforced here, in one pure place shared by every move that changes the
 * lanterns along a path and by the preview of a dragged chain, so what the drag promises and what
 * the rules accept never part:
 * - `any`: every legal chain, as always (the default: chapters 0–3, 6–7, the free mode);
 * - `seen`: "only where your light went" (the flower levels of 4 and 5): a move that lights a
 *   lantern must be the very chain the marks reached, in either direction, and a chain of gain 0
 *   moves lanterns without the light, so it is refused;
 * - `fromBase`: the flower is "closed for the day" (4.10): a move along a path that steps on one of
 *   its petals must start or end at its base, which is the hypothesis of the flower lemma ("the base
 *   may be assumed in the dark").
 */
export type ChainRule =
  | { readonly rule: 'any' }
  | { readonly rule: 'seen' }
  | {
      readonly rule: 'fromBase';
      /** The base of the closed flower. */
      readonly base: VertexId;
      /** Every petal of the flower, the base among them. */
      readonly petals: readonly VertexId[];
    };

/** The rule of a garden whose level says nothing: any legal chain. */
export const ANY_CHAIN: ChainRule = { rule: 'any' };

/** Whether two chains are the same sprouts in the same or the opposite direction. */
const sameChain = (path: readonly VertexId[], other: readonly VertexId[]): boolean =>
  path.length === other.length &&
  (path.every((v, i) => v === other[i]) || path.every((v, i) => v === other[other.length - 1 - i]));

/**
 * Whether the level's chain rule lets the lanterns slide along `path`, a legal chain from a sprout
 * in the dark (checked before by the move itself): an augmenting path (a join is one of one vine)
 * or an even one of gain 0 (a pass of the lantern, a rotated stem). Null if it does; otherwise the
 * stable reason, `chainNotSeen` or `flowerClosed`.
 */
export function judgeLighting(state: GardenState, path: readonly VertexId[]): RejectReason | null {
  const { chains } = state;
  switch (chains.rule) {
    case 'any':
      return null;
    case 'seen': {
      const end = path[path.length - 1];
      const lights = path.length > 1 && end !== undefined && isExposed(state.matching, end);
      const seen = state.chainSeen !== null && sameChain(path, state.chainSeen);
      return lights && seen ? null : { code: 'chainNotSeen' };
    }
    case 'fromBase': {
      const touches = path.some((v) => chains.petals.includes(v));
      const fromBase = path[0] === chains.base || path[path.length - 1] === chains.base;
      return touches && !fromBase ? { code: 'flowerClosed' } : null;
    }
  }
}
