import type { VertexId } from '../graph/types';
import { isExposed, mateOf } from '../matching/queries';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import type { AlternatingForest, ForestLabel } from './forest';
import { pathToRoot } from './pathToRoot';

/**
 * What a sun finds when it looks along one vine (Códex C4). These are the rules the player
 * discovers in the greenhouse (chapter 3) and the algorithm applies; the reducer reuses them.
 */
export type GrowthStep =
  /** An unmarked sprout with a lantern: it becomes a moon and its partner a sun. */
  | {
      readonly kind: 'grow';
      readonly forest: AlternatingForest;
      readonly inner: VertexId;
      readonly outer: VertexId;
    }
  /** A moon: it already has its path to a root and needs no second one (level 3.3). */
  | { readonly kind: 'alreadyInner' }
  /** An augmenting path, listed from one dark end to the other. */
  | { readonly kind: 'chain'; readonly path: readonly VertexId[] }
  /** A sun of the same tree: the vine closes an odd cycle (a blossom, level 4.1). */
  | { readonly kind: 'oddCycle'; readonly from: VertexId; readonly to: VertexId };

/**
 * Applies the growth rules to the vine from sun `u` to `x`. The caller only passes vines of the
 * graph; the forest is never mutated, a grown forest is a copy.
 *
 * Why each chain is augmenting: the climb from `u` to its root alternates and ends in the dark, the
 * vine u–x is dark (u's only lantern goes to its parent, a moon), and the other end is either `x`
 * itself in the dark or the climb from sun `x` to a different root, so the two halves share no
 * sprout. Inside one tree they would meet, which is exactly the odd cycle case.
 */
export function growStep(
  matching: Matching,
  forest: AlternatingForest,
  u: VertexId,
  x: VertexId,
): GrowthStep {
  invariant(forest.label[u] === 'outer', `only a sun may scan its vines, ${u} is not one`);
  const towardsU = pathToRoot(forest, u).reverse();

  switch (forest.label[x]) {
    case 'inner':
      return { kind: 'alreadyInner' };
    case 'outer':
      return forest.root[x] === forest.root[u]
        ? { kind: 'oddCycle', from: u, to: x }
        : { kind: 'chain', path: [...towardsU, ...pathToRoot(forest, x)] };
    default: {
      if (isExposed(matching, x)) return { kind: 'chain', path: [...towardsU, x] };
      const partner = mateOf(matching, x);
      const label: ForestLabel[] = [...forest.label];
      const parent = [...forest.parent];
      const root = [...forest.root];
      const treeRoot = forest.root[u] as VertexId;
      label[x] = 'inner';
      parent[x] = u;
      root[x] = treeRoot;
      label[partner] = 'outer';
      parent[partner] = x;
      root[partner] = treeRoot;
      return { kind: 'grow', forest: { label, parent, root }, inner: x, outer: partner };
    }
  }
}
