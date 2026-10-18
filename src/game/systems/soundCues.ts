import { chainLandings } from '../animation/landings';
import { planAnimation, type AnimationStep } from '../animation/plan';
import type { AssetKey } from '../assets/keys';
import { chimeKey } from './chimeScale';
import type { Effect } from './levelController';

/** One sound to play: its key in the manifest, and when, in ms after its animation starts. */
export interface SoundCue {
  readonly key: AssetKey;
  readonly at: number;
  /** Its own volume within the effects channel, between 0 and 1 (1 when left out). */
  readonly volume?: number;
}

/**
 * The sound of each step (plan 06, section 1.8); a lantern rings the chime of `note`, its place in
 * the run of lanterns it belongs to.
 */
function stepSound(step: AnimationStep, note: number): AssetKey {
  switch (step.kind) {
    case 'hop':
    case 'light':
      return chimeKey(note);
    case 'putOut':
      return 'sfx.putOut';
    case 'mark':
      // The moon is the lower pluck.
      return step.mark === 'sun' ? 'sfx.markSun' : 'sfx.markMoon';
    case 'conflict':
      // Curiosity, not an error.
      return 'sfx.conflict';
    case 'fold':
      return 'sfx.fold';
    case 'unfold':
      return 'sfx.unfold';
    case 'reveal':
      return 'sfx.inspect';
    case 'chain':
      return 'sfx.chainFound';
    case 'clear':
      return 'sfx.searchCleared';
    case 'place':
      return step.object === 'stone' ? 'sfx.stone' : 'sfx.scarecrow';
  }
}

/**
 * The sounds of an animation plan, each starting with its step. A lantern passed along a chain
 * climbs the pentatonic scale, hop i ringing note i, and the new lantern where the chain lands
 * sparkles; a run of lanterns lit by hand climbs the same way. An inspection in the fog is a puff
 * and, halfway through, the drop of water it costs.
 */
export function planCues(steps: readonly AnimationStep[]): SoundCue[] {
  const cues: SoundCue[] = [];
  let at = 0;
  // How many steps of the same lantern run came just before: the note of the next one.
  let run = 0;
  steps.forEach((step, i) => {
    cues.push({ key: stepSound(step, run), at });
    const lantern = step.kind === 'hop' || step.kind === 'light';
    run = lantern && steps[i + 1]?.kind === step.kind ? run + 1 : 0;
    if (step.kind === 'reveal') cues.push({ key: 'sfx.waterDrop', at: at + step.duration / 2 });
    at += step.duration;
  });
  // Each chain sparkles where it lands, as the view shows its new lantern.
  for (const landing of chainLandings(steps)) cues.push({ key: 'sfx.sparkle', at: landing.at });
  return cues.sort((a, b) => a.at - b.at);
}

/** The single sound of a refusal: the soft "back", never a buzzer. */
const REFUSED: readonly SoundCue[] = [{ key: 'sfx.reject', at: 0 }];

/** The sound of a refusal, for the screens whose effects are not the level controller's. */
export const refusalCues = (): SoundCue[] => [...REFUSED];

/**
 * The sounds of one effect of the level controller, from the moment it is shown: an accepted move
 * plays its animation's, a refused one (a move, a touch on the reflection, a drawing that is no
 * chain) the gentle refusal, and what only the script shows plays nothing here. The sun dragged
 * through the day makes no move, so it is never heard.
 */
export function effectCues(effect: Effect): SoundCue[] {
  switch (effect.kind) {
    case 'animate':
      return planCues(planAnimation(effect.events));
    case 'rejected':
    case 'drawRefused':
      return refusalCues();
    case 'flowerDrawn':
      return effect.attempt.kind === 'cut' ? [] : refusalCues();
    default:
      return [];
  }
}
