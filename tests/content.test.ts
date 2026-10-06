import { TEXT_PARAMS } from '@content/keys';
import strings from '@content/es/strings.json';
import { describe, expect, it } from 'vitest';

const table: Record<string, string> = strings;

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
    const forbidden = /grafo|arista|v[ée]rtice|emparejamiento|camino aumentante/i;
    const offending = Object.entries(table).filter(([, text]) => forbidden.test(text));
    expect(offending).toEqual([]);
  });
});
