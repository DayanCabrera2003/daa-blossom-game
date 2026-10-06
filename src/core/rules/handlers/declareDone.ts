import { accept, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';

/**
 * "Terminé" (level 1.8): the player claims the garden cannot do better. The claim is always
 * recorded; whether it is true is judged by the level's victory condition, against Edmonds.
 */
export function declareDone(state: GardenState): ActionOutcome {
  return accept({ ...state, declaredDone: true }, [{ type: 'declareDone' }]);
}
