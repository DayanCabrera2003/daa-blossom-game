import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetEntry } from '../src/game/assets/keys';
import { GLYPHS_PATH, glyphTable } from '../tools/assets/glyphTable';
import type { OutputFile } from '../tools/assets/extract';
import { fontGlyphs } from '../tools/assets/fontGlyphs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string): Uint8Array => new Uint8Array(readFileSync(join(ROOT, path)));
const text = (file: OutputFile): string => Buffer.from(file.bytes).toString('utf8');

describe('the table of the characters each font draws', () => {
  it('maps each font key to the characters of its cmap, as one string', () => {
    const fonts = { 'font.monogram': 'public/assets/fonts/monogram-extended.ttf' };
    const file = glyphTable(fonts, read);
    expect(file.path).toBe(GLYPHS_PATH);
    const table = JSON.parse(text(file)) as Record<string, string>;
    const drawn = fontGlyphs(read(fonts['font.monogram']));
    expect([...(table['font.monogram'] ?? '')].map((ch) => ch.codePointAt(0))).toEqual(drawn);
  });

  it('is committed exactly as the committed font gives it', () => {
    const fonts = { 'font.monogram': `public/${assetEntry('font.monogram').path}` };
    expect(text(glyphTable(fonts, read))).toBe(readFileSync(join(ROOT, GLYPHS_PATH), 'utf8'));
  });
});
