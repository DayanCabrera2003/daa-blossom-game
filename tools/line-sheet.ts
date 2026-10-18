// line-sheet: writes the review sheet of the Spanish lines, docs/review/lineas.md (plan 09, phase
// 11), from the lines and texts of content/es/ and the GDD. `tests/lineSheet.test.ts` fails while
// the sheet is out of date, so run this after changing a line or the GDD.
// Usage: npm run lines.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import lines from '../src/content/es/lines.json';
import strings from '../src/content/es/strings.json';
import { lineSheet } from './review/lineSheet';

const GDD = fileURLToPath(new URL('../docs/GDD.md', import.meta.url));
const SHEET = fileURLToPath(new URL('../docs/review/lineas.md', import.meta.url));

writeFileSync(SHEET, lineSheet({ lines, strings, gdd: readFileSync(GDD, 'utf8') }));
console.log(`wrote ${SHEET}`);
