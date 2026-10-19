import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import glossary from '@content/es/codex/glossary.json';
import { describe, expect, it } from 'vitest';

/**
 * One word, one meaning (plan 10, phase 10; GDD §3.2, §5.1, §5.10). «Flor» is only the flower that
 * folds, «sol» only the mark of the search: the bipartite pair is bees and clovers, the optional
 * puzzles of the hub are secret gardens and the time slider is the day. The retired expressions
 * appear in no text of the game and in no page of the Codex, formal tabs included.
 */

const FOLDER = join(import.meta.dirname, '..', 'src', 'content', 'es', 'codex');

/** Every text the player can read, each with where it comes from. */
const TEXTS: readonly (readonly [string, string])[] = [
  ...Object.entries(strings as Record<string, string>).map(
    ([key, text]) => [`strings ${key}`, text] as const,
  ),
  ...Object.entries(lines as Record<string, string>).map(
    ([id, text]) => [`lines ${id}`, text] as const,
  ),
  ...readdirSync(FOLDER)
    .filter((file) => file.endsWith('.md'))
    .map((file) => [`codex ${file}`, readFileSync(join(FOLDER, file), 'utf8')] as const),
  ...glossary.rows.map((row) => [`glossary ${row.garden}`, row.garden] as const),
];

/** The expressions retired by the phase, each with the name that replaced it. */
const RETIRED: readonly { readonly now: string; readonly pattern: RegExp }[] = [
  // The other species of the greenhouse: bees and clovers, never bees and flowers.
  { now: 'abejas y tréboles', pattern: /abejas,? (y )?flores/i },
  { now: 'un trébol', pattern: /abejas?\b[^.?!:;\n]*\bflor(es)?\b/i },
];

/** The places where a text uses a retired expression. */
const offending = (pattern: RegExp): string[] =>
  TEXTS.filter(([, text]) => pattern.test(text)).map(([where]) => where);

describe('retired words (plan 10, phase 10)', () => {
  for (const { now, pattern } of RETIRED) {
    it(`${String(pattern)} is now «${now}»`, () => {
      expect(offending(pattern)).toEqual([]);
    });
  }
});
