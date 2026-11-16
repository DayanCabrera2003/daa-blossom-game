import type { Edge } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { lightStep, type LightStep } from '@core/rules/lightStep';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';

/**
 * Where the light that searches by itself (GDD §5.1, "La luz busca") stands still: at a flower,
 * before a sun in the fog, at a chain it saw, or with nothing left to look at. The stop is a state
 * of the garden, not a refusal (GDD §5.1): «Avanzar la luz» is switched off and says why while it
 * lasts, and comes back once the player resolves it (folds, inspects, lights the chain). Pure.
 */
export type LightStop = Exclude<LightStep, { readonly kind: 'move' }>;

/** The move «Avanzar la luz» makes while the light can move on. */
export const LIGHT: Action = { type: 'stepLight' };

/** The words on «Avanzar la luz» for each stop. */
const STOP_LABELS: Readonly<Record<LightStop['kind'], string>> = {
  flower: 'hud.light.flower',
  fog: 'hud.light.fog',
  found: 'hud.light.found',
  done: 'hud.light.done',
};

/**
 * Where the light of a garden stands still, or null while it has a mark to make, and in the
 * gardens where the player searches by hand (no light of their own to stop).
 */
export function lightStop(state: GardenState): LightStop | null {
  if (!state.allowed.has('stepLight')) return null;
  const step = lightStep(state);
  return step.kind === 'move' ? null : step;
}

/** What «Avanzar la luz» says in a garden: its own name, or why the light stopped. */
export function lightLabel(state: GardenState): string {
  const stop = lightStop(state);
  return stop === null ? 'hud.stepLight' : STOP_LABELS[stop.kind];
}

/** The words a stop is told with when the light reaches it: those its refusal used to say. */
export function stopReason(stop: LightStop): RejectReason {
  switch (stop.kind) {
    case 'flower':
      return { code: 'lightAtFlower', u: stop.from, v: stop.to };
    case 'fog':
      return { code: 'vineHidden', vertex: stop.vertex };
    case 'found':
      return { code: 'lightFound' };
    case 'done':
      return { code: 'lightDone' };
  }
}

/**
 * The stop a move has just brought the light to, to be told once: the stop of `after` when it is
 * not the very stop `before` was at (folding one flower may stop the light at the next one at
 * once); null when the light can move on, or stands where it stood.
 */
export function stopReached(before: GardenState, after: GardenState): LightStop | null {
  const stop = lightStop(after);
  if (stop === null) return null;
  return JSON.stringify(stop) === JSON.stringify(lightStop(before)) ? null : stop;
}

/** The light that searches by itself has just stopped, told once with what stopped it. */
export interface LightStopped {
  readonly kind: 'lightStopped';
  readonly reason: RejectReason;
}

/**
 * What a move that brings the light to a stop tells (`stopReached`): the stop, with the words its
 * refusal used to say; nothing otherwise. It points at nothing (GDD §5.1): at a flower no vine
 * glows, the player finds where two suns meet, and that glow is the grade-2 hint.
 */
export function stopTold(before: GardenState, after: GardenState): readonly LightStopped[] {
  const stop = stopReached(before, after);
  return stop === null ? [] : [{ kind: 'lightStopped', reason: stopReason(stop) }];
}

/** Whether the light of a garden stands still, its button switched off. */
export const standsStill = (state: GardenState): boolean => lightStop(state) !== null;

/** The vine of the two suns where the light of a garden stands at a flower; null elsewhere. */
export function flowerVine(state: GardenState): Edge | null {
  const stop = lightStop(state);
  return stop?.kind === 'flower' ? [stop.from, stop.to] : null;
}
