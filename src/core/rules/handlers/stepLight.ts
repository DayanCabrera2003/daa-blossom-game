import { lightStep } from '../lightStep';
import { reject, type ActionOutcome } from '../outcome';
import type { GardenState } from '../state';
import { markMoon } from './markMoon';
import { markRoot } from './markRoot';

/**
 * Advance the light (the flower levels, plan 10 section 2.4): the light owns the search and the
 * player moves it on, one mark at a time, in its fixed order (`lightStep`). The mark is made by the
 * very rules of the player's own marks, which the level closes for the day, so its events and its
 * garden are exactly those of the same mark by hand. Where it stops, the reason says why: two suns
 * of one tree meet (`lightAtFlower`, the vine to fold), a sun still in the fog (`vineHidden`, the
 * sprout to inspect), a chain seen (`lightFound`) or nothing left to look at (`lightDone`).
 */
export function stepLight(state: GardenState): ActionOutcome {
  const step = lightStep(state);
  switch (step.kind) {
    case 'move':
      return step.move.type === 'markRoot'
        ? markRoot(state, step.move)
        : markMoon(state, step.move);
    case 'flower':
      return reject({ code: 'lightAtFlower', u: step.from, v: step.to });
    case 'fog':
      return reject({ code: 'vineHidden', vertex: step.vertex });
    case 'found':
      return reject({ code: 'lightFound' });
    case 'done':
      return reject({ code: 'lightDone' });
  }
}
