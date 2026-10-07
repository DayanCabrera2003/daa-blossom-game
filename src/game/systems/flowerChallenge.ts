import { expandPath } from '@core/blossom/expand';
import { cutAtFlower, type FlowerCut } from '@core/blossom/cutAtFlower';
import { searchWithFlowers } from '@core/edmonds/search';
import type { Graph, VertexId } from '@core/graph/types';
import { checkAugmentingPath, type PathError } from '@core/matching/paths';
import type { Matching } from '@core/matching/types';
import { itemAt } from '@core/shared/itemAt';

/**
 * The flower challenge (GDD 4.11, plan 04 phase 3): Sauce claims that if the folded garden has no
 * chain, the open one has none either, and the player, as the adversary, draws any chain in the
 * open garden. None is applied. Each one is cut at the flower (`cutAtFlower`), and the argument is
 * shown in three moments: the chain's two ends are in the dark and only the base is inside the
 * flower, so one end lies outside; from that end to the first petal the chain is a stretch that
 * reaches the flower by a dark vine; in the folded garden that stretch is a chain to the flower,
 * which is in the dark. Pure.
 *
 * A drawing that is no chain of the open garden is refused with its reason and does not count.
 * Nobody is left stuck: a grade-3 hint draws a chain the core finds (`mentorChain`), and after
 * `FLOWER_MISSES_BEFORE_SPARED` refused drawings the step is over anyway.
 */

/** Refused drawings before the step is over anyway. */
export const FLOWER_MISSES_BEFORE_SPARED = 6;

/** The three moments of the argument on one chain, for the animation. */
export interface FlowerArgument {
  /** 1: the chain's ends, both in the dark, and the base, the only petal in the dark. */
  readonly ends: { readonly outside: VertexId; readonly other: VertexId; readonly base: VertexId };
  /** 2: the stretch from the outside end up to the first petal (the whole chain if it has none). */
  readonly stretch: readonly VertexId[];
  /** 3: the same stretch in the ids of the folded garden: a chain there. */
  readonly folded: readonly VertexId[];
}

/** What a drawn chain was. */
export type FlowerAttempt =
  /** No chain of the open garden; `spared` on the drawing that ends the wait. */
  | {
      readonly kind: 'notAChain';
      readonly path: readonly VertexId[];
      readonly error: PathError;
      readonly spared: boolean;
    }
  /** A chain, cut at the flower, with the moments of the argument. */
  | { readonly kind: 'cut'; readonly cut: FlowerCut; readonly argument: FlowerArgument };

/** Everything the challenge remembers. */
export interface FlowerChallenge {
  /** Chains drawn so far. */
  readonly chains: number;
  /** Drawings so far that were no chains. */
  readonly misses: number;
  /** The last drawing, shown until the next one; null before the first. */
  readonly shown: FlowerAttempt | null;
}

/** A challenge with nothing drawn yet. */
export const startFlowerChallenge = (): FlowerChallenge => ({ chains: 0, misses: 0, shown: null });

/** The moments of the argument on a cut chain. */
function argumentOf(cut: FlowerCut, flower: readonly VertexId[]): FlowerArgument {
  return {
    ends: {
      outside: itemAt(cut.chain, 0),
      other: itemAt(cut.chain, cut.chain.length - 1),
      base: itemAt(flower, 0),
    },
    stretch: cut.stretch,
    folded: cut.projected,
  };
}

/**
 * A chain drawn through `path` in the open garden, whose flower (base first, in the dark) is
 * `flower`: cut at the flower when it is a chain, refused otherwise.
 */
export function drawFlowerChain(
  challenge: FlowerChallenge,
  garden: { readonly graph: Graph; readonly matching: Matching },
  flower: readonly VertexId[],
  path: readonly VertexId[],
): { challenge: FlowerChallenge; attempt: FlowerAttempt } {
  const { graph, matching } = garden;
  const checked = checkAugmentingPath(graph, matching, path);
  if (!checked.ok) {
    const misses = challenge.misses + 1;
    const attempt: FlowerAttempt = {
      kind: 'notAChain',
      path,
      error: checked.error,
      spared: misses === FLOWER_MISSES_BEFORE_SPARED,
    };
    return { challenge: { ...challenge, misses, shown: attempt }, attempt };
  }
  const cut = cutAtFlower(graph, matching, flower, path);
  const attempt: FlowerAttempt = { kind: 'cut', cut, argument: argumentOf(cut, flower) };
  return { challenge: { ...challenge, chains: challenge.chains + 1, shown: attempt }, attempt };
}

/**
 * A chain of the open garden, as one search with flowers of the core finds it and unfolds it; null
 * when there is none, because the garden already holds the most.
 */
export function mentorChain(graph: Graph, matching: Matching): VertexId[] | null {
  const outcome = searchWithFlowers(graph, matching);
  return outcome.kind === 'augmentingPath' ? expandPath(outcome.layer, outcome.path) : null;
}
