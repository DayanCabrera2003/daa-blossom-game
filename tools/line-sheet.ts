// line-sheet: writes the review sheet of the Spanish lines, docs/review/lineas.md (plan 09, phase
// 11), from the lines and texts of content/es/ and the GDD; and the sheets of the lines changed
// since a release: since 1.0.1 in docs/review/lineas-plan10.md (plan 10, phase 0) and since 1.1.0
// in docs/review/lineas-plan11.md (plan 11, phase 0). `tests/lineSheet.test.ts` and
// `tests/changeSheet.test.ts` fail while a sheet is out of date, so run this after changing a line,
// a text or the GDD.
// Usage: npm run lines.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import baseLines101 from './review/baseline/lines-1.0.1.json';
import baseLines110 from './review/baseline/lines-1.1.0.json';
import baseStrings101 from './review/baseline/strings-1.0.1.json';
import baseStrings110 from './review/baseline/strings-1.1.0.json';
import { changeSheet, type ChangeSheetSources } from './review/changeSheet';
import { lineSheet } from './review/lineSheet';

const GDD = fileURLToPath(new URL('../docs/GDD.md', import.meta.url));
const SHEET = fileURLToPath(new URL('../docs/review/lineas.md', import.meta.url));

/** Each sheet of changes: the release it compares with, its plan and its copies of that release. */
const CHANGES: readonly Omit<ChangeSheetSources, 'lines' | 'strings'>[] = [
  { version: '1.0.1', plan: 10, baseLines: baseLines101, baseStrings: baseStrings101 },
  { version: '1.1.0', plan: 11, baseLines: baseLines110, baseStrings: baseStrings110 },
];

writeFileSync(SHEET, lineSheet({ lines, strings, gdd: readFileSync(GDD, 'utf8') }));
console.log(`wrote ${SHEET}`);
for (const base of CHANGES) {
  const path = fileURLToPath(new URL(`../docs/review/lineas-plan${base.plan}.md`, import.meta.url));
  writeFileSync(path, changeSheet({ ...base, lines, strings }));
  console.log(`wrote ${path}`);
}
