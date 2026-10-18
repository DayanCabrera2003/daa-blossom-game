// check-budget: weighs the built game against its budget (plan 06, phase 11): the JavaScript of
// dist/, which only a build knows, with the assets of the manifest.
// Usage: npm run build && npm run budget. Exits with code 1 if any part is over its limit.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import manifestJson from '../src/game/assets/manifest.json';
import { parseManifest } from '../src/game/assets/manifestSchema';
import { budgetReport, manifestSizes } from './assets/budget';
import { formatTable } from './formatTable';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

if (!existsSync(DIST)) throw new Error('no dist/ folder: run npm run build first');

// Every script the build emits; the copied assets of public/ hold none.
const js = readdirSync(DIST, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .reduce((total, entry) => total + statSync(join(entry.parentPath, entry.name)).size, 0);

const report = budgetReport({ ...manifestSizes(parseManifest(manifestJson)), js });

/** A size in kilobytes, decimal like the budget. */
const kb = (bytes: number): string => `${(bytes / 1000).toFixed(0)} KB`;

console.log(
  formatTable(
    ['part', 'size', 'limit', ''],
    report.map((row) => [row.part, kb(row.bytes), kb(row.limit), row.over ? 'OVER' : 'ok']),
  ),
);
if (report.some((row) => row.over)) process.exitCode = 1;
