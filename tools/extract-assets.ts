// extract-assets: turns the CC0 pack zips of assets-src/packs/ into the files the game ships.
// Usage: npm run assets         writes public/assets/** and src/game/assets/manifest.json
//        npm run assets:check   writes nothing; exits with code 1 unless the committed files are
//                               exactly what the zips give (local only: the zips are not committed)
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareOutputs } from './assets/compareOutputs';
import { extract } from './assets/extract';
import { SELECTION } from './assets/selection';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PACKS_DIR = join(ROOT, 'assets-src/packs');
const ASSETS_DIR = 'public/assets';

/** Every file under public/assets/, relative to the repository root, with forward slashes. */
function listAssets(): string[] {
  const dir = join(ROOT, ASSETS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(ROOT.length).split('\\').join('/'))
    .sort();
}

const readZip = (zip: string): Uint8Array => {
  const path = join(PACKS_DIR, zip);
  if (!existsSync(path)) throw new Error(`missing ${zip}: download it into assets-src/packs/`);
  return new Uint8Array(readFileSync(path));
};

const { files } = extract(SELECTION, readZip);

if (process.argv.includes('--check')) {
  const problems = compareOutputs(files, {
    read: (path) => {
      const full = join(ROOT, path);
      return existsSync(full) ? new Uint8Array(readFileSync(full)) : null;
    },
    listAssets,
  });
  for (const problem of problems) console.log(`  !!  ${problem}`);
  console.log(
    problems.length === 0
      ? `${files.length} files agree with the packs.`
      : `\n${problems.length} problems: run npm run assets to regenerate.`,
  );
  if (problems.length > 0) process.exitCode = 1;
} else {
  // Start from an empty folder, so a file dropped from the selection does not linger.
  rmSync(join(ROOT, ASSETS_DIR), { recursive: true, force: true });
  for (const { path, bytes } of files) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), bytes);
  }
  console.log(`Wrote ${files.length} files.`);
}
