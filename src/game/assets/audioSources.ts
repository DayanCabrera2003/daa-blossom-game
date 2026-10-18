import fallbackJson from './fallbacks.json';
import { parseFallbacks, type Fallback } from './fallbackSchema';
import { assetEntry, type AssetKey } from './keys';

/** The fallbacks, validated once when the game starts. */
const FALLBACKS = parseFallbacks(fallbackJson);

/**
 * The files to offer for a sound served at `path` with `fallback` (or none), in order: the original
 * first, then its fallback. Phaser's loader takes the first one the browser says it can play, so a
 * browser that decodes Ogg Vorbis fetches the original and only Safari before 18.4 the AAC copy.
 */
export const sourcesOf = (path: string, fallback: Fallback | undefined): string[] =>
  fallback === undefined ? [path] : [path, fallback.path];

/** The files to offer for the sound `key` (plan 09, phase 8): its manifest path and its fallback. */
export const audioSources = (key: AssetKey): string[] =>
  sourcesOf(assetEntry(key).path, FALLBACKS.files[key]);
