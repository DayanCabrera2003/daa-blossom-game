import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { isMaximum } from '@core/edmonds/fast/maximum';
import type { Edge } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { GardenState } from '@core/rules/state';
import { isVictory, statusOf, stonesAreTheMoons, type VictoryCondition } from '@core/rules/victory';

/**
 * Why a "Terminé" (or «Presentar») that does not win falls short (GDD §5.2): a gentle answer,
 * never where the chain is. Only a certificate of scarecrows shows something in the garden: one
 * vine nobody guards, which the player can check with their own eyes.
 */
export type ClaimVerdict =
  /** The garden still holds a chain: more lanterns fit. */
  | { readonly code: 'chainLeft' }
  /** The search still has dark vines to look along from some sun. */
  | { readonly code: 'searchOpen' }
  /**
   * A vine no scarecrow guards: the first in order of ids that the fog lets the player see, or
   * null when every unguarded vine is still hidden.
   */
  | { readonly code: 'unguarded'; readonly vine: Edge | null }
  /** The scarecrows guard every vine but are not as many as the lanterns. */
  | { readonly code: 'countMismatch'; readonly scarecrows: number; readonly lanterns: number }
  /**
   * The Council's count does not close: at least `atLeast` sprouts must sleep in the dark with
   * these stones, and `dark` do.
   */
  | { readonly code: 'countShort'; readonly atLeast: number; readonly dark: number }
  /** Stones from the moons are presented before the search is over without a chain. */
  | { readonly code: 'searchNotOver' }
  /** The stones lifted are not the moons of the search. */
  | { readonly code: 'notTheMoons' };

/** The stable code of a verdict. */
export type ClaimVerdictCode = ClaimVerdict['code'];

/** Whether the fog lets the player see the vine u–v: no fog, or one of its ends inspected. */
const inSight = (state: GardenState, [u, v]: Edge): boolean =>
  state.revealed === null || state.revealed[u] === true || state.revealed[v] === true;

/** The first unguarded vine the player can see, in order of ids; null when there is none in sight. */
function unguardedVine(state: GardenState): Edge | null {
  const guarded = new Set(state.scarecrows);
  const unguarded = state.graph.edges
    .filter(([u, v]) => !guarded.has(u) && !guarded.has(v))
    .map(([u, v]): Edge => (u < v ? [u, v] : [v, u]))
    .sort(([a, b], [c, d]) => a - c || b - d);
  return unguarded.find((vine) => inSight(state, vine)) ?? null;
}

/** Why the Council's count does not close: how many must sleep in the dark at least, and how many do. */
function countShort(state: GardenState): ClaimVerdict {
  const { graph, matching, stones } = state;
  const proof = checkTutteBerge(graph, matching, stones);
  const lit = size(matching);
  // Valid stones always give a bound; `notTight` carries it (no lifted stone repeats).
  const bound = !proof.ok && proof.error.code === 'notTight' ? proof.error.bound : lit;
  return { code: 'countShort', atLeast: Math.max(0, graph.n - 2 * bound), dark: graph.n - 2 * lit };
}

/**
 * Why the claim in the garden `state` (made with "Terminé", already recorded in it) does not meet
 * the level's `victory`, or null when it does, or when there is no victory to judge it by. Pure:
 * every fact comes from the core, so the answer never contradicts the judge.
 */
export function claimVerdict(
  state: GardenState,
  victory: VictoryCondition | undefined,
): ClaimVerdict | null {
  if (victory === undefined || isVictory(state, victory)) return null;
  switch (victory.type) {
    case 'matchingSize':
    case 'maximum':
      return isMaximum(state.graph, state.matching) ? null : { code: 'chainLeft' };
    case 'chainFound':
    case 'searchComplete':
      return { code: 'searchOpen' };
    case 'searchExhausted':
      // A chain the marks already saw is no search left open: it is lanterns left to light.
      return state.chainSeen === null ? { code: 'searchOpen' } : { code: 'chainLeft' };
    case 'coverCertificate': {
      if (!checkVertexCover(state.graph, state.scarecrows).ok)
        return { code: 'unguarded', vine: unguardedVine(state) };
      const lanterns = size(state.matching);
      return { code: 'countMismatch', scarecrows: state.scarecrows.length, lanterns };
    }
    case 'coverComplete':
      return { code: 'unguarded', vine: unguardedVine(state) };
    case 'tutteBergeCertificate':
      return countShort(state);
    case 'moonCertificate':
      if (state.search === null || statusOf(state) !== 'exhausted')
        return { code: 'searchNotOver' };
      return stonesAreTheMoons(state) ? countShort(state) : { code: 'notTheMoons' };
  }
}
