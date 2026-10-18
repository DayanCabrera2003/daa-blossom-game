import { itemAt } from '@core/shared/itemAt';
import type { AssetKey } from '../assets/keys';

/**
 * The lantern chimes, lowest first: a major pentatonic scale from C5 to A7 (plan 06, section 1.8;
 * GDD §4.2), synthesized by `npm run sounds`.
 */
export const CHIME_KEYS = [
  'sfx.chime1',
  'sfx.chime2',
  'sfx.chime3',
  'sfx.chime4',
  'sfx.chime5',
  'sfx.chime6',
  'sfx.chime7',
  'sfx.chime8',
  'sfx.chime9',
  'sfx.chime10',
  'sfx.chime11',
  'sfx.chime12',
  'sfx.chime13',
  'sfx.chime14',
  'sfx.chime15',
] as const satisfies readonly AssetKey[];

/** The top note of the scale. */
const TOP = CHIME_KEYS.length - 1;

/**
 * The note (0 is the lowest) of each hop of a chain of `hops` hops: hop i rings note i, so a chain
 * of k hops climbs k notes; past the top of the scale the chain stays on its highest note, so it
 * never goes down.
 */
export const chimeNotes = (hops: number): number[] =>
  Array.from({ length: hops }, (_, i) => Math.min(i, TOP));

/** The chime of note `note`, kept on the scale. */
export const chimeKey = (note: number): AssetKey =>
  itemAt(CHIME_KEYS, Math.max(0, Math.min(TOP, Math.round(note))));
