// synthesize-sounds: makes the project's own sounds from their versioned parameters
// (tools/synth/sounds.ts) and puts them into the committed manifest, without the pack zips.
// Usage: npm run sounds   writes public/assets/audio/sfx/*.wav of the own work and updates
//                         src/game/assets/manifest.json (`npm run assets` makes the same files)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest } from '../src/game/assets/manifestSchema';
import { MANIFEST_PATH, manifestFile } from './assets/extract';
import { makeOwnWork, withOwnWork } from './assets/ownWork';
import { OWN_WORK } from './synth/sounds';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const write = (path: string, bytes: Uint8Array): void => {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), bytes);
};

const before = parseManifest(JSON.parse(readFileSync(join(ROOT, MANIFEST_PATH), 'utf8')));
const { files, assets } = makeOwnWork(OWN_WORK);
const after = withOwnWork(before, OWN_WORK, assets);

// A sound dropped from the parameters leaves no file behind.
const kept = new Set(Object.values(after.assets).map((entry) => entry.path));
for (const entry of Object.values(before.assets)) {
  const path = join(ROOT, 'public', entry.path);
  if (entry.pack === OWN_WORK.id && !kept.has(entry.path) && existsSync(path)) rmSync(path);
}

for (const { path, bytes } of files) write(path, bytes);
const manifest = manifestFile(after);
write(manifest.path, manifest.bytes);
console.log(`Wrote ${files.length} sounds and the manifest.`);
