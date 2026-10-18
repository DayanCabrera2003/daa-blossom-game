import type { VertexId } from '../graph/types';
import { isExposed, mateOf } from '../matching/queries';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import type { AlternatingForest, GrowingForest } from './forest';
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
 * What a vine from a sun shows, before anything is built: the case of the growth rules it falls
 * in. Reading it costs O(1) (a label, a root and a lantern), which is what an ordinary examination
 * of Algorithm 10.1 may cost (Códex C11); the climbs to a root are only built for a chain.
 */
export type VineReading =
  | { readonly kind: 'grow'; readonly inner: VertexId; readonly outer: VertexId }
  | { readonly kind: 'alreadyInner' }
  | { readonly kind: 'chain' }
  | { readonly kind: 'oddCycle'; readonly from: VertexId; readonly to: VertexId };

/** Reads the vine from sun `u` to `x` (the caller only passes vines of the graph). */
export function readVine(
  matching: Matching,
  forest: AlternatingForest,
  u: VertexId,
  x: VertexId,
): VineReading {
  invariant(forest.label[u] === 'outer', `only a sun may scan its vines, ${u} is not one`);
  switch (forest.label[x]) {
    case 'inner':
      return { kind: 'alreadyInner' };
    case 'outer':
      return forest.root[x] === forest.root[u]
        ? { kind: 'oddCycle', from: u, to: x }
        : { kind: 'chain' };
    default:
      return isExposed(matching, x)
        ? { kind: 'chain' }
        : { kind: 'grow', inner: x, outer: mateOf(matching, x) };
  }
}

/**
 * The chain a vine from sun `u` to `x` closes, from one dark end to the other: the climb from `u`
 * to its root, reversed, then `x` alone if it is in the dark or the climb from sun `x` otherwise.
 *
 * Why it is augmenting: the climb from `u` alternates and ends in the dark, the vine u–x is dark
 * (u's only lantern goes to its parent, a moon), and the other end is either `x` itself in the dark
 * or the climb from sun `x` to a different root, so the two halves share no sprout. Inside one tree
 * they would meet, which is exactly the odd cycle case.
 */
export function chainThrough(forest: AlternatingForest, u: VertexId, x: VertexId): VertexId[] {
  const towardsU = pathToRoot(forest, u).reverse();
  return forest.label[x] === 'outer' ? [...towardsU, ...pathToRoot(forest, x)] : [...towardsU, x];
}

/** Hangs moon `inner` from sun `u` and its partner `outer` from it, in the forest itself. */
export function growInto(
  forest: GrowingForest,
  u: VertexId,
  inner: VertexId,
  outer: VertexId,
): void {
  const treeRoot = itemAt(forest.root, u);
  forest.label[inner] = 'inner';
  forest.parent[inner] = u;
  forest.root[inner] = treeRoot;
  forest.label[outer] = 'outer';
  forest.parent[outer] = inner;
  forest.root[outer] = treeRoot;
}

/**
 * Applies the growth rules to the vine from sun `u` to `x`, building what the case needs. The
 * forest is never mutated: a grown forest is a copy, which suits a player's move; the search, which
 * owns its forest, reads the vine and grows in place instead.
 */
export function growStep(
  matching: Matching,
  forest: AlternatingForest,
  u: VertexId,
  x: VertexId,
): GrowthStep {
  const reading = readVine(matching, forest, u, x);
  switch (reading.kind) {
    case 'chain':
      return { kind: 'chain', path: chainThrough(forest, u, x) };
    case 'grow': {
      const grown: GrowingForest = {
        label: [...forest.label],
        parent: [...forest.parent],
        root: [...forest.root],
      };
      growInto(grown, u, reading.inner, reading.outer);
      return { kind: 'grow', forest: grown, inner: reading.inner, outer: reading.outer };
    }
    default:
      return reading;
  }
}
