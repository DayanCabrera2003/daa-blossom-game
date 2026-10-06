import type { Action } from './actions';
import { chain } from './handlers/chain';
import { declareDone } from './handlers/declareDone';
import { fold } from './handlers/fold';
import { foldAt } from './handlers/foldAt';
import { inspect } from './handlers/inspect';
import { join } from './handlers/join';
import { markMoon } from './handlers/markMoon';
import { markRoot } from './handlers/markRoot';
import { passLantern } from './handlers/passLantern';
import { rotateStem } from './handlers/rotateStem';
import { placeScarecrow, removeScarecrow } from './handlers/scarecrows';
import { split } from './handlers/split';
import { dropStone, liftStone } from './handlers/stones';
import { unfold } from './handlers/unfold';
import { reject, type ActionOutcome } from './outcome';
import type { GardenState } from './state';

/**
 * The rules of the garden: `applyAction(state, action)` is the only way the game changes a garden
 * (GDD §5.1). It checks that the level has unlocked the action and hands it to its handler, which
 * validates it with the core's own checks. The logic is instant and pure; the game animates the
 * returned events and keeps old states for undo and the sun slider.
 */
export function applyAction(state: GardenState, action: Action): ActionOutcome {
  if (!state.allowed.has(action.type)) {
    return reject({ code: 'actionLocked', action: action.type });
  }
  switch (action.type) {
    case 'join':
      return join(state, action);
    case 'split':
      return split(state, action);
    case 'passLantern':
      return passLantern(state, action);
    case 'chain':
      return chain(state, action);
    case 'rotateStem':
      return rotateStem(state, action);
    case 'inspect':
      return inspect(state, action);
    case 'markRoot':
      return markRoot(state, action);
    case 'markMoon':
      return markMoon(state, action);
    case 'foldAt':
      return foldAt(state, action);
    case 'fold':
      return fold(state, action);
    case 'unfold':
      return unfold(state, action);
    case 'placeScarecrow':
      return placeScarecrow(state, action);
    case 'removeScarecrow':
      return removeScarecrow(state, action);
    case 'liftStone':
      return liftStone(state, action);
    case 'dropStone':
      return dropStone(state, action);
    case 'declareDone':
      return declareDone(state);
  }
}
