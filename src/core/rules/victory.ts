import { checkTutteBerge } from '../certificates/tutteBerge';
import { checkVertexCover } from '../certificates/vertexCover';
import { isMaximum } from '../edmonds/fast/maximum';
import { size } from '../matching/queries';
import { searchStatus, type SearchStatus } from '../search/searchStatus';
import type { GardenState } from './state';

/**
 * What a level asks for, declared in its JSON (`{ "type": "matchingSize", "value": 3 }`…). The
 * optimum is never written by hand: "Terminé" is judged against Edmonds, so a level can never
 * reward a wrong claim, nor punish a right one, because of a typo in its data.
 */
export type VictoryCondition =
  /** At least this many lanterns lit (visible goal, chapters 0–1). */
  | { readonly type: 'matchingSize'; readonly value: number }
  /** "Terminé" said, and true (hidden goal, from 1.8). */
  | { readonly type: 'maximum' }
  /** The marks reached a chain (4.4: find it, applying comes later). */
  | { readonly type: 'chainFound' }
  /**
   * The search is complete (3.3, 4.2): the marks reached a chain, or the search is over without one
   * (`searchStatus` says `exhausted`), even when that "no chain" is the lie of a search that may not
   * fold (4.1, 4.2). A chain within reach counts only once the player has looked along it, so the
   * level is never won by a chain the player has not seen, nor by one still hidden in the fog.
   */
  | { readonly type: 'searchComplete' }
  /**
   * The search is over without a chain, and "Terminé" says so (3.6, 4.9). Like the certificates, it
   * counts only once claimed, so the level is not won the moment the last mark is placed.
   */
  | { readonly type: 'searchExhausted' }
  /**
   * Scarecrows guard every vine, exactly as many as lanterns: König's proof (3.7, 3.8). Like the
   * Tutte–Berge proof below, it counts only once presented with "Terminé" (GDD §5.2); otherwise a
   * level whose certificate already closes would be won before the player does anything (7.2).
   */
  | { readonly type: 'coverCertificate' }
  /** The lifted stones prove the lanterns maximum: Tutte–Berge (chapter 7). */
  | { readonly type: 'tutteBergeCertificate' };

/** Where the player's search stands, under the level's roots and with folding if it is allowed. */
const statusOf = (state: GardenState): SearchStatus =>
  searchStatus(state.layer, state.search, {
    roots: state.roots,
    foldAllowed: state.allowed.has('foldAt'),
  });

/** Whether the garden meets the condition. */
export function isVictory(state: GardenState, condition: VictoryCondition): boolean {
  const lanterns = size(state.matching);
  switch (condition.type) {
    case 'matchingSize':
      return lanterns >= condition.value;
    case 'maximum':
      return state.declaredDone && isMaximum(state.graph, state.matching);
    case 'chainFound':
      return state.chainSeen !== null;
    case 'searchComplete':
      return state.chainSeen !== null || statusOf(state) === 'exhausted';
    case 'searchExhausted':
      return state.declaredDone && statusOf(state) === 'exhausted';
    case 'coverCertificate':
      return (
        state.declaredDone &&
        state.scarecrows.length === lanterns &&
        checkVertexCover(state.graph, state.scarecrows).ok
      );
    case 'tutteBergeCertificate':
      return state.declaredDone && checkTutteBerge(state.graph, state.matching, state.stones).ok;
  }
}
