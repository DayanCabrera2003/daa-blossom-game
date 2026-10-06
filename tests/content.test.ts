import { TEXT_PARAMS } from '@content/keys';
import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { catalog } from '@levels/catalog';
import { referencedLines } from '@levels/lines';
import { describe, expect, it } from 'vitest';

const table: Record<string, string> = strings;
const lineTable: Record<string, string> = lines;

/** Words that belong to the Codex only (GDD §2, principle 2). */
const MATHEMATICS = /grafo|arista|v[ée]rtice|emparejamiento|camino aumentante/i;

/** The `{name}` placeholders of a text, sorted. */
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort();

describe('interface text (content/es/strings.json)', () => {
  it('every key the game uses has a text', () => {
    const missing = Object.keys(TEXT_PARAMS).filter((key) => !(key in table));
    expect(missing).toEqual([]);
  });

  it('no text is left over without a key that uses it', () => {
    const unused = Object.keys(table).filter((key) => !(key in TEXT_PARAMS));
    expect(unused).toEqual([]);
  });

  it('each text uses exactly the parameters the game fills in', () => {
    for (const [key, params] of Object.entries(TEXT_PARAMS)) {
      expect({ key, used: placeholders(table[key] ?? '') }).toEqual({
        key,
        used: [...params].sort(),
      });
    }
  });

  it('every way an action can be refused has a gentle text, sub-reasons included', () => {
    for (const key of [
      'reason.sunMeetsSun',
      'reason.invalidPath.notAlternating',
      'reason.notAFlower.evenLength',
    ]) {
      expect(table[key]).toBeTruthy();
    }
  });

  it('never names the mathematics outside the Codex (GDD §2, principle 2)', () => {
    const offending = Object.entries(table).filter(([, text]) => MATHEMATICS.test(text));
    expect(offending).toEqual([]);
  });
});

describe('dialogue lines (content/es/lines.json)', () => {
  it('every line a level refers to has a text', () => {
    const missing = catalog().flatMap((level) =>
      referencedLines(level.data).filter((id) => !(id in lineTable)),
    );
    expect(missing).toEqual([]);
  });

  it('no line is left over without a level that speaks it', () => {
    const spoken = new Set(catalog().flatMap((level) => referencedLines(level.data)));
    expect(Object.keys(lineTable).filter((id) => !spoken.has(id))).toEqual([]);
  });

  it('never names the mathematics outside the Codex (GDD §2, principle 2)', () => {
    const offending = Object.entries(lineTable).filter(([, text]) => MATHEMATICS.test(text));
    expect(offending).toEqual([]);
  });
});
