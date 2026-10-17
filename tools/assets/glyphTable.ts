// The table of the characters each extracted font draws, written next to the manifest so the
// coverage test (tests/fontCoverage.test.ts) can check every text of the game against it.
import type { OutputFile } from './extract';
import { fontGlyphs } from './fontGlyphs';

/** Where the table lives, relative to the repository root. */
export const GLYPHS_PATH = 'src/game/assets/glyphs.json';

/**
 * From each font's key and file (relative to the repository root, read by `read`), the JSON file
 * that maps the key to every character the font draws, in code point order, as one string.
 */
export function glyphTable(
  fonts: Readonly<Record<string, string>>,
  read: (path: string) => Uint8Array,
): OutputFile {
  const table = Object.fromEntries(
    Object.entries(fonts).map(([key, path]) => [
      key,
      String.fromCodePoint(...fontGlyphs(read(path))),
    ]),
  );
  const json = `${JSON.stringify(table, null, 2)}\n`;
  return { path: GLYPHS_PATH, bytes: new Uint8Array(Buffer.from(json, 'utf8')) };
}
