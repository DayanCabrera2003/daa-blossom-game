// extract-assets: turns the CC0 pack zips of assets-src/packs/ into the files the game ships.
// Usage: npm run assets         writes public/assets/**, src/game/assets/manifest.json and the
//                               table of the characters each font draws (glyphs.json)
//        npm run assets:check   writes nothing; exits with code 1 unless the committed files are
//                               exactly what the zips give (local only: the zips are not committed)
//                               and every Ogg sound has a sound AAC fallback (plan 09, phase 8)
// The fallbacks are made by `npm run assets:fallbacks` (ffmpeg); `npm run assets` keeps them.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fallbackJson from '../src/game/assets/fallbacks.json';
import { parseFallbacks } from '../src/game/assets/fallbackSchema';
import { compareOutputs } from './assets/compareOutputs';
import { extract } from './assets/extract';
import { checkFallbacks } from './assets/fallbackCheck';
import { mp4DurationMs } from './assets/mp4Duration';
import { oggVorbisInfo } from './assets/oggVorbis';
import { glyphTable } from './assets/glyphTable';
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

const extraction = extract(SELECTION, readZip);
const extracted = extraction.files;

/** The audio fallbacks, which no pack gives: made by ffmpeg, checked apart, kept on a rewrite. */
const fallbacks = parseFallbacks(fallbackJson);
const fallbackFiles = new Set(Object.values(fallbacks.files).map((file) => `public/${file.path}`));

/** The bytes at a path relative to the repository root, or null when there is no such file. */
const readCommitted = (path: string): Uint8Array | null => {
  const full = join(ROOT, path);
  return existsSync(full) ? new Uint8Array(readFileSync(full)) : null;
};

// The characters each font draws, read from the extracted bytes rather than from the disk, which
// the write below replaces.
const fonts = Object.fromEntries(
  SELECTION.files
    .filter((file) => file.kind === 'font')
    .map((file) => [file.key, `${ASSETS_DIR}/${file.out}`]),
);
const extractedBytes = (path: string): Uint8Array => {
  const found = extracted.find((file) => file.path === path);
  if (found === undefined) throw new Error(`${path} is not among the extracted files`);
  return found.bytes;
};
const files = [...extracted, glyphTable(fonts, extractedBytes)];

if (process.argv.includes('--check')) {
  const problems = [
    ...compareOutputs(files, {
      read: readCommitted,
      listAssets: () => listAssets().filter((path) => !fallbackFiles.has(path)),
    }),
    ...checkFallbacks(extraction.manifest, fallbacks, {
      originalMs: (path) => oggVorbisInfo(extractedBytes(path)).durationMs,
      fallback: (path) => {
        const bytes = readCommitted(path);
        return bytes === null ? null : { bytes: bytes.length, durationMs: mp4DurationMs(bytes) };
      },
    }),
  ];
  for (const problem of problems) console.log(`  !!  ${problem}`);
  console.log(
    problems.length === 0
      ? `${files.length} files agree with the packs.`
      : `\n${problems.length} problems: run npm run assets to regenerate.`,
  );
  if (problems.length > 0) process.exitCode = 1;
} else {
  // Start from an empty folder, so a file dropped from the selection does not linger; the audio
  // fallbacks, which only ffmpeg makes, are put back as they were (the check says if one is stale).
  const kept = [...fallbackFiles].flatMap((path) => {
    const bytes = readCommitted(path);
    return bytes === null ? [] : [{ path, bytes }];
  });
  rmSync(join(ROOT, ASSETS_DIR), { recursive: true, force: true });
  for (const { path, bytes } of [...files, ...kept]) {
    mkdirSync(dirname(join(ROOT, path)), { recursive: true });
    writeFileSync(join(ROOT, path), bytes);
  }
  console.log(`Wrote ${files.length} files.`);
}
