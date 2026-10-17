import { invariant } from '@core/shared/invariant';
import manifestJson from './manifest.json';
import {
  parseManifest,
  type AssetKind,
  type ManifestEntry,
  type PackCredit,
} from './manifestSchema';

/**
 * Every key of the generated manifest, as a type: code names assets by these keys, never by loose
 * strings, so a key dropped from the selection fails the type check where it is used.
 */
export type AssetKey = keyof typeof manifestJson.assets;

/** The manifest, validated once when the game starts. */
const MANIFEST = parseManifest(manifestJson);

/** Every key, in the order the manifest lists them. */
export const ASSET_KEYS = Object.keys(MANIFEST.assets) as AssetKey[];

/** What the manifest says about one asset: where it lives, its kind, group, size and pack. */
export function assetEntry(key: AssetKey): ManifestEntry {
  const entry = MANIFEST.assets[key];
  invariant(entry !== undefined, `the asset manifest has no key ${key}`);
  return entry;
}

/** The keys of one kind of asset, in manifest order. */
export function keysOfKind(kind: AssetKind): AssetKey[] {
  return ASSET_KEYS.filter((key) => assetEntry(key).kind === kind);
}

/** The credits of every pack the manifest takes files from. */
export function packCredits(): PackCredit[] {
  return Object.values(MANIFEST.packs);
}

/** The credits of one pack, by the id the manifest's entries name it with. */
export function packCredit(id: string): PackCredit {
  const pack = MANIFEST.packs[id];
  invariant(pack !== undefined, `the asset manifest has no pack ${id}`);
  return pack;
}
