import { invariant } from '@core/shared/invariant';
import { audioSources } from './audioSources';
import { ASSET_KEYS, assetEntry, packCredit, type AssetKey } from './keys';
import { LOAD_GROUPS, type LoadGroup } from './manifestSchema';

/**
 * What each scene loads, decided from the manifest alone (plan 06, phase 2): the preload scene
 * loads the `boot` group (the art, the effects, the babble syllables and the jingles) before the
 * hub; the hub, once it shows, loads its music behind it (plan 09, phase 9); and a level loads the
 * music of its chapter when it is not loaded yet. The scenes only hand these answers to Phaser's
 * loader.
 */

/** The keys of one load group, in manifest order. */
export function groupKeys(group: LoadGroup): AssetKey[] {
  return ASSET_KEYS.filter((key) => assetEntry(key).group === group);
}

/** Everything the preload scene loads before the first screen. */
export const BOOT_KEYS: readonly AssetKey[] = groupKeys('boot');

/** The keys of `group` that `loaded` says are not there yet, in manifest order. */
export function missingKeys(group: LoadGroup, loaded: (key: AssetKey) => boolean): AssetKey[] {
  return groupKeys(group).filter((key) => !loaded(key));
}

/**
 * What a screen that plays the hub's track (the hub, the free mode) loads behind itself once it
 * shows: the `hub` group (its music), unless it is loaded already. The screen works without it;
 * the music starts with its fade when it arrives.
 */
export function hubKeys(loaded: (key: AssetKey) => boolean): AssetKey[] {
  return missingKeys('hub', loaded);
}

/**
 * The load group of a level's chapter, from its id (`4.10` is chapter 4, so `ch4`); null when the
 * manifest has no group for that chapter.
 */
export function chapterGroup(levelId: string): LoadGroup | null {
  const chapter = /^(\d+)\./.exec(levelId)?.[1];
  const group = LOAD_GROUPS.find((candidate) => candidate === `ch${chapter}`);
  return group ?? null;
}

/**
 * What a level loads as it opens: its chapter's group (its music, and the race variant in chapter
 * 6) minus whatever `loaded` says is there already, so a second level of the same chapter loads
 * nothing.
 */
export function levelKeys(levelId: string, loaded: (key: AssetKey) => boolean): AssetKey[] {
  const group = chapterGroup(levelId);
  return group === null ? [] : missingKeys(group, loaded);
}

/**
 * One call to Phaser's loader: which file type, under which key, from which path; a sound from the
 * files it is offered as, in order (`audioSources`), of which the loader fetches the first one the
 * browser can play.
 */
export type LoadRequest =
  | { readonly loader: 'image'; readonly key: string; readonly path: string }
  | {
      readonly loader: 'spritesheet';
      readonly key: string;
      readonly path: string;
      readonly frameWidth: number;
      readonly frameHeight: number;
    }
  | { readonly loader: 'audio'; readonly key: string; readonly paths: readonly string[] };

/** A Kenney picture, which is loaded raw and then recoloured to the palette under its own key. */
export interface Recolour {
  readonly key: AssetKey;
  /** Where the loader leaves the picture as it comes from the pack. */
  readonly rawKey: string;
  /** The frame size of a sheet, or null for a plain image. */
  readonly frame: { readonly width: number; readonly height: number } | null;
}

/** The key the loader keeps a picture under before it is recoloured. */
export const rawKeyOf = (key: AssetKey): string => `${key}.raw`;

/**
 * Whether a picture is recoloured when it loads: the Kenney art, which does not share the Ninja
 * Adventure palette (plan 06, section 1.1). Sounds never are.
 */
function isRecoloured(key: AssetKey): boolean {
  const entry = assetEntry(key);
  const picture = entry.kind === 'image' || entry.kind === 'sheet';
  return picture && packCredit(entry.pack).author === 'Kenney';
}

/** How the loader fetches one asset, or null for the font, which the page loads with CSS. */
function requestOf(key: AssetKey): LoadRequest | null {
  const { kind, path, frame } = assetEntry(key);
  if (isRecoloured(key)) return { loader: 'image', key: rawKeyOf(key), path };
  switch (kind) {
    case 'image':
      return { loader: 'image', key, path };
    case 'sheet':
      invariant(frame !== undefined, `the sheet ${key} has no frame size in the manifest`);
      return {
        loader: 'spritesheet',
        key,
        path,
        frameWidth: frame.width,
        frameHeight: frame.height,
      };
    case 'font':
      return null;
    case 'music':
    case 'sfx':
    case 'voice':
    case 'jingle':
      return { loader: 'audio', key, paths: audioSources(key) };
  }
}

/**
 * The loader calls for `keys`, in their order. The font is left out: the page declares it with
 * `@font-face` and the game waits for it before starting, so text never draws in a fallback.
 */
export function loadRequests(keys: readonly AssetKey[]): LoadRequest[] {
  return keys.flatMap((key) => {
    const request = requestOf(key);
    return request === null ? [] : [request];
  });
}

/** The pictures among `keys` that are recoloured once loaded, in their order. */
export function recolouredSheets(keys: readonly AssetKey[]): Recolour[] {
  return keys.filter(isRecoloured).map((key) => ({
    key,
    rawKey: rawKeyOf(key),
    frame: assetEntry(key).frame ?? null,
  }));
}
