import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '@game/view/palette';

/**
 * The small gardens of the Codex are drawn in SVG by the books, which may not import the game, so
 * their stylesheet copies the game's colours as tokens (plan 07, phase 4). Each token is named
 * after the colour of the palette it copies (`--dg-dark-vine` is `PALETTE.darkVine`) and must be
 * exactly it; the sheet uses no other colour.
 */

const SHEET = readFileSync(
  join(import.meta.dirname, '..', 'src', 'ui', 'diagram', 'diagram.css'),
  'utf8',
);

/** The tokens the sheet defines, by name, with their colour as a number. */
const tokens = new Map(
  [...SHEET.matchAll(/--dg-([a-z-]+):\s*#([0-9a-f]{6});/g)].map((match) => [
    match[1] as string,
    Number.parseInt(match[2] as string, 16),
  ]),
);

/** `dark-vine` is `darkVine`. */
const camel = (name: string): string =>
  name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

describe('the colours of the Codex gardens (src/ui/diagram/diagram.css)', () => {
  it('copies each colour of the game it names exactly', () => {
    expect(tokens.size).toBeGreaterThan(8);
    const palette: Readonly<Record<string, number>> = PALETTE;
    for (const [name, colour] of tokens) {
      expect({ name, colour }).toEqual({ name, colour: palette[camel(name)] });
    }
  });

  it('uses only the tokens it defines, and no colour outside them', () => {
    for (const used of SHEET.matchAll(/var\(--dg-([a-z-]+)\)/g)) {
      expect(tokens.has(used[1] as string)).toBe(true);
    }
    const definitions = SHEET.replace(/--dg-[a-z-]+:\s*#[0-9a-f]{6};/g, '');
    expect(definitions.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    expect(definitions.match(/rgba?\(/g)).toBeNull();
  });
});
