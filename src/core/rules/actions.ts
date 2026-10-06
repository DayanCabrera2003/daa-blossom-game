import type { VertexId } from '../graph/types';

/**
 * Everything the gardener can do (GDD §5.1). Actions name original sprouts, which is what the
 * player touches; touching any petal of a folded flower means touching the flower. Each level
 * unlocks a subset (see `permissions.ts`); the reducer validates every action against the rules.
 */
export type Action =
  /** Light a lantern between two neighbors in the dark (Join, 0.1). */
  | { readonly type: 'join'; readonly u: VertexId; readonly v: VertexId }
  /** Put out the lantern between two sprouts (Split, 0.1). */
  | { readonly type: 'split'; readonly u: VertexId; readonly v: VertexId }
  /** A sprout in the dark takes the lantern of a lit neighbor, whose partner goes dark (1.1). */
  | { readonly type: 'passLantern'; readonly from: VertexId; readonly to: VertexId }
  /** Drag a chain from a sprout in the dark: +1 if it ends in the dark, gain 0 otherwise (1.3, 1.4). */
  | { readonly type: 'chain'; readonly path: readonly VertexId[] }
  /** A chain of gain 0 ending at the base of a flower, now with a name (4.10). */
  | { readonly type: 'rotateStem'; readonly stem: readonly VertexId[] }
  /** Lift the fog around a sprout, for a drop of water (3.1). */
  | { readonly type: 'inspect'; readonly vertex: VertexId }
  /** Put a sun on a sprout in the dark: a search starts from it (3.1). */
  | { readonly type: 'markRoot'; readonly vertex: VertexId }
  /** Look from a sun along a dark vine: the sprout reached gets a moon, its partner a sun (3.1). */
  | { readonly type: 'markMoon'; readonly from: VertexId; readonly to: VertexId }
  /** Touch the vine where two suns of one tree meet: their loop folds into a flower (4.4). */
  | { readonly type: 'foldAt'; readonly from: VertexId; readonly to: VertexId }
  /** Select an odd loop and fold it into a flower, outside any search (4.4). */
  | { readonly type: 'fold'; readonly loop: readonly VertexId[] }
  /** Open a folded flower, by its id (4.5). */
  | { readonly type: 'unfold'; readonly blossom: number }
  /** Place or remove a scarecrow guarding every vine of a sprout (3.7). */
  | { readonly type: 'placeScarecrow'; readonly vertex: VertexId }
  | { readonly type: 'removeScarecrow'; readonly vertex: VertexId }
  /** Lift a stone off a sprout, or put it back (7.2). */
  | { readonly type: 'liftStone'; readonly vertex: VertexId }
  | { readonly type: 'dropStone'; readonly vertex: VertexId }
  /** Say "Terminé": the garden cannot do better (1.8). */
  | { readonly type: 'declareDone' };

/** The tag of an action; levels unlock actions by tag. */
export type ActionType = Action['type'];
