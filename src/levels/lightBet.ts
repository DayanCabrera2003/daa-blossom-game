import type { Edge } from '@core/graph/types';
import { applyAction } from '@core/rules/applyAction';
import { lightStep } from '@core/rules/lightStep';
import type { GardenState } from '@core/rules/state';

/** More marks than any garden of the catalog lets the light make before it stops. */
const MAX_MARKS = 1000;

/**
 * Where the light that searches by itself (GDD §5.1) first stops at a flower, advanced alone from
 * `state`: the vine of the two suns that meet, as the light finds it (`from`–`to`). Null when it
 * stops first for anything else (the fog, a chain, nothing left), or when the garden has no light
 * of its own. What a bet on the stop (from 4.6) is checked against. Pure.
 */
export function firstFlowerStop(state: GardenState): Edge | null {
  if (!state.allowed.has('stepLight')) return null;
  let garden = state;
  for (let marks = 0; marks < MAX_MARKS; marks++) {
    const step = lightStep(garden);
    if (step.kind === 'flower') return [step.from, step.to];
    if (step.kind !== 'move') return null;
    const moved = applyAction(garden, { type: 'stepLight' });
    if (!moved.ok) return null;
    garden = moved.state;
  }
  return null;
}

/** Whether two vines are the same, whichever way round each is written. */
export const sameVine = ([a, b]: Edge, [u, v]: Edge): boolean =>
  (a === u && b === v) || (a === v && b === u);
