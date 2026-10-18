import { runOf } from '@core/cost/benchmark';
import type { LevelStep } from '@levels/flow';
import { raceOf } from '@levels/races';
import { stopTime } from '../picture/raceClock';
import type { SoundCue } from './soundCues';

/**
 * The sounds of the race at step `index` of a script (plan 06, section 1.8), from the moment it
 * starts on screen: Bruto falling asleep sounds the descending "minimize" as his counter stops
 * (GDD 6.4); a race he finishes awake, or a step that is no race, makes no sound of its own.
 */
export function raceCues(steps: readonly LevelStep[], index: number): SoundCue[] {
  const step = steps[index];
  if (step?.step !== 'race') return [];
  const bruto = runOf(raceOf(step), 'bruto');
  return bruto.asleep ? [{ key: 'sfx.brutoSleeps', at: stopTime(bruto) }] : [];
}
