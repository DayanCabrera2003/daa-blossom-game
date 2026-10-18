// The second source of the manifest: files the project makes itself (the synthesized bells), not
// taken from a pack. They are written and described like pack files, under the own work's id, so
// the game, the asset tests and the credits treat both alike. `npm run assets` makes them with
// the pack files; `npm run sounds` makes only them and puts them into the committed manifest.
import { createHash } from 'node:crypto';
import type { Manifest, ManifestEntry } from '../../src/game/assets/manifestSchema';
import type { OutputFile } from './extract';
import type { OwnWork } from './types';

/** What the own work adds: its files, and their entries in the manifest, in its order. */
export interface MadeOutputs {
  readonly files: readonly OutputFile[];
  readonly assets: Readonly<Record<string, ManifestEntry>>;
}

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

/** Makes every file of the own work and describes it, as the extractor does with pack files. */
export function makeOwnWork(own: OwnWork): MadeOutputs {
  const files: OutputFile[] = [];
  const assets: Record<string, ManifestEntry> = {};
  for (const file of own.files) {
    const bytes = file.make();
    files.push({ path: `public/assets/${file.out}`, bytes });
    assets[file.key] = {
      path: `assets/${file.out}`,
      kind: file.kind,
      group: file.group,
      pack: own.id,
      source: file.source,
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  }
  return { files, assets };
}

/**
 * The manifest with its own work replaced by `assets`: every pack file stays where it is, and the
 * own work goes last, as `npm run assets` lists it, so both commands give the same manifest.
 */
export function withOwnWork(
  manifest: Manifest,
  own: OwnWork,
  assets: Readonly<Record<string, ManifestEntry>>,
): Manifest {
  const kept = Object.entries(manifest.assets).filter(([, entry]) => entry.pack !== own.id);
  for (const [key] of kept) {
    if (key in assets) throw new Error(`the key ${key} is both a pack file and a made file`);
  }
  const packs = Object.entries(manifest.packs).filter(([id]) => id !== own.id);
  return {
    packs: { ...Object.fromEntries(packs), [own.id]: own.credit },
    assets: { ...Object.fromEntries(kept), ...assets },
  };
}
