import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { catalog } from '@levels/catalog';
import { referencedLines } from '@levels/lines';
import { describe, expect, it } from 'vitest';

/**
 * The names Sauce says are on the screen (GDD §3.3, the names of the sprouts). Where a line calls a
 * sprout by its name (Hortensia, Ana, Sami…), that name is the label drawn under a sprout of the
 * level that says it; elsewhere the lines say the letter of the label. A name, here, is a label
 * written as a word: a capital and at least two small letters.
 */

const TABLE: Readonly<Record<string, string>> = lines;
const STRINGS: Readonly<Record<string, string>> = strings;
const levels = catalog();

/** The proper nouns of the world that are not sprouts: places, characters, books. */
const WORLD = new Set([
  'Bruto',
  'Consejo',
  'Cuaderno',
  'Códex',
  'Estanque',
  'Festival',
  'Huerto',
  'Invernadero',
  'Prado',
  'Recetario',
  'Robles',
  'Sauce',
  // The tools of the bar, which the lines name as the player sees them («con Marcas»).
  ...Object.entries(STRINGS)
    .filter(([key]) => key.startsWith('tool.'))
    .map(([, name]) => name),
]);

/** Whether a label is written as a name rather than a letter (with a digit or not). */
const isName = (label: string): boolean => /^\p{Lu}\p{Ll}{2,}$/u.test(label);

/** The capitalised words of a text that do not open a sentence, quotes left out. */
function midSentenceWords(text: string): string[] {
  const plain = text.replace(/«[^»]*»/g, '');
  const words: string[] = [];
  for (const match of plain.matchAll(/(\S*)\s+(\p{Lu}\p{Ll}+)\b/gu)) {
    const before = match[1] ?? '';
    // A word after the end of a sentence, an opening mark or a dash opens a sentence itself.
    if (/[.?!:…—]$/u.test(before) || before === '') continue;
    words.push(match[2] ?? '');
  }
  return words.filter((word) => !/^[¿¡]/u.test(word));
}

/** Every name written as a label anywhere in the catalog. */
const NAMES = new Set(
  levels.flatMap((level) => level.data.sprouts.map((s) => s.label)).filter(isName),
);

describe('the names of the sprouts', () => {
  it('only the gardens of the Orchard and the Meadow write names under their sprouts', () => {
    const named = levels
      .filter((level) => level.data.sprouts.some((sprout) => isName(sprout.label)))
      .map((level) => level.data.id);
    expect(named.every((id) => /^[01]\./.test(id))).toBe(true);
    expect(named).toEqual(expect.arrayContaining(['0.4', '1.1', '1.2', '1.3', '1.4']));
  });

  it.each(levels.map((level) => [level.data.id, level] as const))(
    'level %s: every name its lines say is the label of one of its sprouts',
    (_, level) => {
      const labels = new Set(level.data.sprouts.map((sprout) => sprout.label));
      const strangers = referencedLines(level.data).flatMap((id) => {
        const text = TABLE[id] ?? '';
        const said = [
          ...midSentenceWords(text).filter((word) => !WORLD.has(word)),
          ...[...text.matchAll(/\p{Lu}\p{Ll}+/gu)].map((m) => m[0]).filter((w) => NAMES.has(w)),
        ];
        return said.filter((word) => !labels.has(word)).map((word) => `${id}: ${word}`);
      });
      expect(strangers).toEqual([]);
    },
  );
});
