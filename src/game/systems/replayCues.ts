import type { GardenState } from '@core/rules/state';
import { UNMATCHED } from '@core/matching/types';
import type { AssetKey } from '../assets/keys';
import { MIX } from '../audio/mix';
import { chimeKey } from './chimeScale';
import type { SoundCue } from './soundCues';

/**
 * How loud a replayed day sounds, against the move itself: an echo of the day, not the day. A
 * number of the mix (`audio/mix.ts`, plan 09, phase 8).
 */
export const REPLAY_VOLUME = MIX.replay;

/** How many lanterns are lit: each joins two sprouts. */
const lanterns = (state: GardenState): number =>
  state.matching.mate.filter((mate) => mate !== UNMATCHED).length / 2;

/** How many sprouts carry a mark of the given kind. */
const marked = (state: GardenState, label: 'outer' | 'inner'): number =>
  state.search?.label.filter((each) => each === label).length ?? 0;

/** How many sprouts the fog no longer hides. */
const seen = (state: GardenState): number => state.revealed?.filter(Boolean).length ?? 0;

const sameList = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * What one step of a replayed day sounds like, read off the two gardens alone (a replay holds the
 * states, not the moves): the first change heard wins. Lanterns climb the scale with their count,
 * so the day rises as the garden lights up; a flower folds or opens; marks, stones, scarecrows and
 * the fog sound as their moves do.
 */
function heard(from: GardenState, to: GardenState): AssetKey | null {
  const before = lanterns(from);
  const now = lanterns(to);
  if (now < before) return 'sfx.putOut';
  if (now > before || !sameList(from.matching.mate, to.matching.mate)) return chimeKey(now - 1);
  if (to.layer.nodes.length < from.layer.nodes.length) return 'sfx.fold';
  if (to.layer.nodes.length > from.layer.nodes.length) return 'sfx.unfold';
  if (from.search !== null && to.search === null) return 'sfx.searchCleared';
  if (marked(to, 'inner') > marked(from, 'inner')) return 'sfx.markMoon';
  if (marked(to, 'outer') > marked(from, 'outer')) return 'sfx.markSun';
  if (!sameList(from.stones, to.stones)) return 'sfx.stone';
  if (!sameList(from.scarecrows, to.scarecrows)) return 'sfx.scarecrow';
  if (seen(to) > seen(from)) return 'sfx.inspect';
  return null;
}

/**
 * The sound of one step of a replayed day, from `from` to `to`, softer than the move itself. The
 * replay plays it as the sun reaches the step; dragging the sun replays nothing, so it is silent.
 */
export function replayCues(from: GardenState, to: GardenState): SoundCue[] {
  const key = heard(from, to);
  return key === null ? [] : [{ key, at: 0, volume: REPLAY_VOLUME }];
}
