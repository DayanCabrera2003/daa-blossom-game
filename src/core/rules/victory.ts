import { checkTutteBerge } from '../certificates/tutteBerge';
import { checkVertexCover } from '../certificates/vertexCover';
import { fastEdmonds } from '../edmonds/fast/solve';
import { size } from '../matching/queries';
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
  /** Scarecrows guard every vine, exactly as many as lanterns: König's proof (3.7, 3.8). */
  | { readonly type: 'coverCertificate' }
  /** The lifted stones prove the lanterns maximum: Tutte–Berge (chapter 7). */
  | { readonly type: 'tutteBergeCertificate' };

/** Whether the garden meets the condition. */
export function isVictory(state: GardenState, condition: VictoryCondition): boolean {
  const lanterns = size(state.matching);
  switch (condition.type) {
    case 'matchingSize':
      return lanterns >= condition.value;
    case 'maximum':
      return state.declaredDone && lanterns === size(fastEdmonds(state.graph));
    case 'chainFound':
      return state.chainSeen !== null;
    case 'coverCertificate':
      return (
        state.scarecrows.length === lanterns && checkVertexCover(state.graph, state.scarecrows).ok
      );
    case 'tutteBergeCertificate':
      return checkTutteBerge(state.graph, state.matching, state.stones).ok;
  }
}
