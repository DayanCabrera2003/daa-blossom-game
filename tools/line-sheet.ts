// line-sheet: writes the review sheet of the Spanish lines, docs/review/lineas.md (plan 09, phase
// 11), from the lines and texts of content/es/ and the GDD; and the sheet of the lines changed
// since version 1.0.1, docs/review/lineas-plan10.md (plan 10, phase 0). `tests/lineSheet.test.ts`
// and `tests/changeSheet.test.ts` fail while a sheet is out of date, so run this after changing a
// line, a text or the GDD.
// Usage: npm run lines.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import baseLines from './review/baseline/lines-1.0.1.json';
import baseStrings from './review/baseline/strings-1.0.1.json';
import { changeSheet } from './review/changeSheet';
import { lineSheet } from './review/lineSheet';

const GDD = fileURLToPath(new URL('../docs/GDD.md', import.meta.url));
const SHEET = fileURLToPath(new URL('../docs/review/lineas.md', import.meta.url));
const CHANGES = fileURLToPath(new URL('../docs/review/lineas-plan10.md', import.meta.url));

writeFileSync(SHEET, lineSheet({ lines, strings, gdd: readFileSync(GDD, 'utf8') }));
console.log(`wrote ${SHEET}`);
writeFileSync(CHANGES, changeSheet({ lines, strings, baseLines, baseStrings }));
console.log(`wrote ${CHANGES}`);
