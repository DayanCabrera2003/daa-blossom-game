import type { VertexId } from '../graph/types';
import { isExposed } from '../matching/queries';
import { looksFrom, type LightMove } from '../search/autoSearch';
import { plantForest } from '../search/forest';
import { readVine } from '../search/growForest';
import { itemAt } from '../shared/itemAt';
import type { GardenState } from './state';

/**
 * What the light does next in a flower level (plan 10, section 2.4; GDD §5.1, "La luz busca"):
 * - `move`: its next mark, a sun on a sprout in the dark or a look along a dark vine, which the
 *   rules apply like the player's own marks;
 * - `flower`: two suns of one tree meet along the vine `from`–`to`, and it stops there: only
 *   folding that loop lets it go on;
 * - `fog`: the sun it would look from next still has its vines hidden, and it stops until the
 *   sprout is inspected;
 * - `found`: it has seen a chain, which waits to be lit;
 * - `done`: it has nothing left to look at, and no chain.
 */
export type LightStep =
  | { readonly kind: 'move'; readonly move: LightMove }
  | { readonly kind: 'flower'; readonly from: VertexId; readonly to: VertexId }
  | { readonly kind: 'fog'; readonly vertex: VertexId }
  | { readonly kind: 'found' }
  | { readonly kind: 'done' };

/**
 * The next step of the light that folds, in the fixed order of the light of 4.1 (`autoSearch`):
 * the suns already marked first, in ascending order of their ids in the garden as folded, each
 * looking along its dark vines in the order of `looksFrom`; then the roots of the level, in their
 * order (every sprout in ascending order when the level names none), the first in the dark and
 * unmarked getting a sun. Looks that change nothing (a moon, "already marked") are passed over.
 *
 * Unlike the light of 4.1, which leaves two suns of one tree as "already marked" and lies, this
 * light stops where they meet. It is a pure function of the garden, so undoing a mark and pressing
 * again gives the same mark, and the order never depends on how the garden was reached. In the fog
 * it never feels its way: it stops before the first look from a sprout still covered.
 */
export function lightStep(state: GardenState): LightStep {
  if (state.chainSeen !== null) return { kind: 'found' };
  const { layer, revealed } = state;
  const forest = state.search ?? plantForest(layer.matching, []);
  for (let sun = 0; sun < layer.nodes.length; sun++) {
    if (forest.label[sun] !== 'outer') continue;
    for (const [from, to] of looksFrom(layer, sun)) {
      if (revealed !== null && !itemAt(revealed, from)) return { kind: 'fog', vertex: from };
      const reading = readVine(layer.matching, forest, sun, itemAt(layer.nodeOf, to));
      switch (reading.kind) {
        case 'alreadyInner':
          continue;
        case 'oddCycle':
          return { kind: 'flower', from, to };
        default:
          return { kind: 'move', move: { type: 'markMoon', from, to } };
      }
    }
  }
  const starts = state.roots ?? layer.nodeOf.map((_, sprout) => sprout);
  for (const root of starts) {
    const node = itemAt(layer.nodeOf, root);
    if (forest.label[node] === 'none' && isExposed(layer.matching, node)) {
      return { kind: 'move', move: { type: 'markRoot', vertex: root } };
    }
  }
  return { kind: 'done' };
}
