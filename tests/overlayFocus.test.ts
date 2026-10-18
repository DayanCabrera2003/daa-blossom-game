import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrast } from '@game/picture/contrast';

// The keyboard over the canvas (plan 09, phase 4): the books, the epilogue and the free mode's
// share sheet are DOM, and their controls take the browser's own focus, kept inside the open book
// by `ui/overlay.ts`. Each of them wears the books' stylesheet, whose ring round the control in
// focus is a pixel of ink a pixel out, which reads on the wood (WCAG asks 3:1 of a focus ring) and
// on the paper; no sheet takes that ring away from what can be focused.

const UI = join(import.meta.dirname, '..', 'src', 'ui');
const read = (...path: string[]): string => readFileSync(join(UI, ...path), 'utf8');

const BOOK = read('book', 'book.css');

/** The colour the books' sheet gives a custom property, as a number. */
function token(name: string): number {
  const found = new RegExp(`--${name}:\\s*#([0-9a-f]{6});`).exec(BOOK);
  if (found === null) throw new Error(`no token --${name}`);
  return Number.parseInt(found[1] ?? '', 16);
}

/** The overlays a player reaches with the keyboard, by the module that opens each. */
const OVERLAYS = [
  ['the frame of the Códex and the Cuaderno', 'book', 'bookFrame.ts'],
  ['the epilogue', 'epilogue', 'EpilogueScreen.ts'],
  ['the share sheet', 'sandbox', 'ShareSheet.ts'],
] as const;

/** Every stylesheet of the overlays. */
const SHEETS = [
  ['book', 'book.css'],
  ['codex', 'codex.css'],
  ['notebook', 'notebook.css'],
  ['epilogue', 'epilogue.css'],
  ['sandbox', 'share.css'],
] as const;

describe('the focus ring over the canvas', () => {
  it('the books ring the control in focus with a pixel of ink, a pixel out', () => {
    const start = BOOK.indexOf('\n.book :focus-visible {');
    expect(start).toBeGreaterThanOrEqual(0);
    const rule = BOOK.slice(start, BOOK.indexOf('}', start));
    expect(rule).toMatch(/outline: var\(--px\) solid var\(--ink\);/);
    expect(rule).toMatch(/outline-offset: var\(--px\);/);
  });

  it('the ink of the ring reads on the wood and on the paper', () => {
    expect(contrast(token('ink'), token('wood'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('ink'), token('paper'))).toBeGreaterThanOrEqual(3);
    expect(contrast(token('ink'), token('button'))).toBeGreaterThanOrEqual(3);
  });

  it.each(OVERLAYS)('%s wears the books’ stylesheet', (_, folder, module) => {
    expect(read(folder, module)).toMatch(/import '\.\.\/book\/book\.css';|import '\.\/book\.css';/);
  });

  it.each(SHEETS)('%s/%s takes the ring from nothing that can be focused', (folder, sheet) => {
    const text = read(folder, sheet);
    for (const found of text.matchAll(/([^{}]+)\{[^}]*outline:\s*(none|0)\b/g)) {
      // Only the book itself, which takes the focus as it opens so Escape and Tab reach it, has none.
      expect((found[1] ?? '').trim()).toBe('.book');
    }
  });
});
