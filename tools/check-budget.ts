// check-budget: weighs the built game against its budget (plan 06, phase 11): the built files of
// dist/, which only a build knows, with the assets of the manifest. The build manifest tells the
// initial script from the books loaded on demand (plan 07, phase 2) and from the free mode, also
// loaded on demand and weighed in its own part (plan 08, phase 9), and from the level screen, loaded
// behind its gate and weighed in its own part too; KaTeX and marked must be in the books only. Each part is also reported as it is sent, gzipped (as GitHub Pages serves text) and
// brotli-compressed (plan 09, phase 9): reported, not limited.
// Usage: npm run build && npm run budget. Exits with code 1 if any part is over its limit, or if
// the initial script bundles KaTeX or marked.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fallbackJson from '../src/game/assets/fallbacks.json';
import { parseFallbacks } from '../src/game/assets/fallbackSchema';
import manifestJson from '../src/game/assets/manifest.json';
import { parseManifest } from '../src/game/assets/manifestSchema';
import { budgetReport, manifestSizes } from './assets/budget';
import { packedSize, servedWeights } from './assets/compressed';
import { buildFiles, parseViteManifest } from './assets/buildChunks';
import { isFreeMode } from './assets/freeMode';
import { isLevelScreen } from './assets/levelScreen';
import { librariesIn } from './assets/deferredLibraries';
import { formatTable } from './formatTable';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const BUILD_MANIFEST = join(DIST, '.vite', 'manifest.json');

if (!existsSync(BUILD_MANIFEST)) throw new Error('no dist/.vite/manifest.json: run npm run build');

const files = buildFiles(
  parseViteManifest(JSON.parse(readFileSync(BUILD_MANIFEST, 'utf8'))),
  isFreeMode,
  isLevelScreen,
);

/** The bytes of some built files. */
const weigh = (paths: readonly string[]): number =>
  paths.reduce((total, path) => total + statSync(join(DIST, path)).size, 0);

// Each sound weighs the larger of its original and its fallback: what one browser fetches.
const sizes = manifestSizes(parseManifest(manifestJson), parseFallbacks(fallbackJson));
const report = budgetReport({
  ...sizes,
  js: weigh(files.initial),
  codex: weigh(files.deferred),
  sandbox: weigh(files.freeMode),
  level: weigh(files.level),
});

/** Some built files with their bytes, to weigh them compressed. */
const read = (paths: readonly string[]) =>
  paths.map((path) => ({ path, bytes: new Uint8Array(readFileSync(join(DIST, path))) }));
const served = servedWeights(report, {
  js: packedSize(read(files.initial)),
  codex: packedSize(read(files.deferred)),
  sandbox: packedSize(read(files.freeMode)),
  level: packedSize(read(files.level)),
});

/** A size in kilobytes, decimal like the budget. */
const kb = (bytes: number): string => `${(bytes / 1000).toFixed(0)} KB`;

console.log(
  formatTable(
    ['part', 'size', 'gzip', 'brotli', 'limit', ''],
    report.map((row, index) => [
      row.part,
      kb(row.bytes),
      kb(served[index]?.gzip ?? row.bytes),
      kb(served[index]?.brotli ?? row.bytes),
      kb(row.limit),
      row.over ? 'OVER' : 'ok',
    ]),
  ),
);
console.log('\n(gzip and brotli: as sent compressed; pictures, sounds and fonts go as they are)');

// What the deployment holds, both files of every sound with a fallback: not limited.
console.log(`\ndeployed assets, the audio fallbacks among them: ${kb(sizes.deployed)}`);

// Shipped for old browsers but never fetched, so listed and not weighed.
console.log(`\nnot weighed, older font formats (${kb(weigh(files.skipped))}):`);
for (const path of files.skipped) console.log(`  ${path}`);

// The heavy libraries of the books must never reach the first screen.
const leaks = files.initial
  .filter((path) => path.endsWith('.js'))
  .flatMap((path) =>
    librariesIn(readFileSync(join(DIST, path), 'utf8')).map((name) => `${name} in ${path}`),
  );
console.log(
  leaks.length === 0
    ? '\nKaTeX and marked: not in the initial script'
    : `\nOVER: the initial script bundles ${leaks.join(', ')}`,
);

if (report.some((row) => row.over) || leaks.length > 0) process.exitCode = 1;
