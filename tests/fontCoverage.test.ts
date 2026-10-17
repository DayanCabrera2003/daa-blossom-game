import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import glyphs from '../src/game/assets/glyphs.json';

// Every character the game can write has a glyph in the pixel font (plan 06, section 1.2): the
// texts of content/es/, the cards, the level files, and every string literal of the code that
// draws or words things (game/, services/, levels/). A missing glyph would show as a box or fall
// back to another font, so a symbol the font lacks is drawn as an icon instead.

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DRAWN = new Set([...glyphs['font.monogram']]);

/** Line breaks and tabs lay text out; they are never drawn as glyphs. */
const LAYOUT_CHARACTERS = new Set(['\n', '\r', '\t']);

/** Every file under `dir` (relative to the repository root) whose name passes `keep`. */
function filesUnder(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && keep(entry.name))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).split('\\').join('/'))
    .sort();
}

/** Every string inside a parsed JSON value, keys aside. */
function jsonStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonStrings);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(jsonStrings);
  return [];
}

/** The text of every string and template literal of a TypeScript file; comments are left out. */
function literals(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(join(ROOT, path), 'utf8'),
    ts.ScriptTarget.Latest,
  );
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      found.push(node.text);
    }
    node.forEachChild(visit);
  };
  visit(source);
  return found;
}

/** The characters of `texts` the font cannot draw, each once, with an example of where. */
function missing(texts: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const text of texts) {
    for (const ch of text) {
      if (!DRAWN.has(ch) && !LAYOUT_CHARACTERS.has(ch)) out[ch] ??= text;
    }
  }
  return out;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));

const JSON_FILES = [
  ...filesUnder('src/content/es', (name) => name.endsWith('.json')),
  'src/levels/cards/cards.json',
  ...filesUnder('src/levels/data', (name) => name.endsWith('.json')),
];

const CODE_FILES = ['src/game', 'src/services', 'src/levels'].flatMap((dir) =>
  filesUnder(dir, (name) => name.endsWith('.ts') && !name.endsWith('.test.ts')),
);

describe('the pixel font draws every character the game writes', () => {
  it('knows the characters of the font, Spanish letters included', () => {
    for (const ch of 'áéíóúüñÁÉÍÓÚÑ¿¡«»–−≈→…') expect(DRAWN.has(ch)).toBe(true);
  });

  it.each(JSON_FILES)('%s', (path) => {
    expect(missing(jsonStrings(readJson(path)))).toEqual({});
  });

  it.each(CODE_FILES)('the literals of %s', (path) => {
    expect(missing(literals(path))).toEqual({});
  });
});
