import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import glossary from '@content/es/codex/glossary.json';
import { catalog } from '@levels/catalog';
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
  // The optional puzzles of the hub: secret gardens, never hidden or secret flowers.
  { now: 'un jardín secreto', pattern: /\bflor(es)? (secreta|escondida)s?\b/i },
  // The time slider: the day, never the sun, which is only the mark of the search.
  {
    now: 'el día',
    pattern: /\b(arrastra\w*|mueve\w*|mover|movido|lleva\w*|sigue)\s+(al|el)\s+sol\b/i,
  },
  { now: 'el día', pattern: /\bmuestra el sol\b/i },
  { now: 'el día', pattern: /^el sol$/i },
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

describe('«flor» is only the flower that folds', () => {
  const FLOWER = /\bflor(es)?\b/i;

  it('no line of chapters 0 to 3 says it: no flower folds there yet', () => {
    const early = Object.entries(lines as Record<string, string>)
      .filter(([id, text]) => /^ch[0-3]\./.test(id) && FLOWER.test(text))
      .map(([id]) => id);
    expect(early).toEqual([]);
  });

  it('no text of the hub says it: its signposts, buds and keys name no flower level', () => {
    const hub = Object.entries(strings as Record<string, string>)
      .filter(([key, text]) => /^(hub|keys)\./.test(key) && FLOWER.test(text))
      .map(([key]) => key);
    expect(hub).toEqual([]);
  });
});

describe('one word, one meaning (GDD §3.3)', () => {
  const AGUA = /\bagua\b/i;

  it('«hilo» is only a piece of the tangle: what a sprout carries are its lanterns', () => {
    const carried =
      /hilos? (que )?le salen|sus hilos|hilos? por brote|cuántos hilos puede|hilo (ámbar|plateado)|^Hilos: /i;
    expect(offending(carried)).toEqual([]);
  });

  it('the rival of the pond is the reflection: no text of the pond says «agua»', () => {
    const pond = TEXTS.filter(
      ([where]) => /^lines ch2\./.test(where) || /^strings (pond|mirror|diagram\.pond)/.test(where),
    ).concat(TEXTS.filter(([where]) => where === 'codex C03.md'));
    expect(pond.filter(([, text]) => AGUA.test(text)).map(([where]) => where)).toEqual([]);
  });

  it('what the fog spends are drops: «agua» is only ever said as «gotas de agua»', () => {
    expect(offending(/(?<!gotas? de )\bagua\b/i)).toEqual([]);
  });

  it('«base» is named when 4.6 is won, before any line asks for it', () => {
    const BASE = /\bbase\b/i;
    const before = Object.entries(lines as Record<string, string>)
      .filter(([id]) => /^ch([0-3]\.|4\.[1-5]\.)/.test(id))
      .filter(([, text]) => BASE.test(text))
      .map(([id]) => id);
    expect(before).toEqual([]);
    const level = catalog().find((one) => one.data.id === '4.6');
    const flow = level?.data.flow ?? [];
    const play = flow.findIndex((step) => step.step === 'play');
    const after = flow
      .slice(play + 1)
      .flatMap((step) => (step.step === 'say' ? step.lines : []))
      .map((id) => (lines as Record<string, string>)[id] ?? '');
    expect(play).toBeGreaterThanOrEqual(0);
    expect(after.some((text) => BASE.test(text))).toBe(true);
  });

  it('the close of 3.1 ties the sun to the free hand and the moon to asking', () => {
    const close = (lines as Record<string, string>)['ch3.1.sauce.05'] ?? '';
    expect(close).toMatch(/mano libre[^.]*\bsol\b/);
    expect(close).toMatch(/pidiendo[^.]*\bluna\b/);
  });

  it('no letters for numbers, no «vosotros», no «solitario», and the mentor is Sauce', () => {
    // The formal tabs of the Codex write their mathematics; what the game says never does.
    const said = TEXTS.filter(([where]) => !where.startsWith('codex'));
    const wrong =
      /\bk (espantapájaros|piedras|faroles)\b|\bde k\b|\bg − k\b|\bg grupos\b|\bten[ée]is\b|\bvosotros\b|solitari|\bel mentor\b/i;
    expect(said.filter(([, text]) => wrong.test(text)).map(([where]) => where)).toEqual([]);
    expect(offending(/solitari|\bten[ée]is\b/i)).toEqual([]);
  });

  it('a closed flower is a folded one: the loop of 4.10 that cannot fold is a loop', () => {
    const table: Readonly<Record<string, string>> = { ...strings, ...lines };
    for (const id of ['ch4.10.sauce.00', 'reason.flowerClosed']) {
      expect(table[id], id).not.toMatch(/cerrad/i);
      expect(table[id], id).toMatch(/bucle/i);
    }
  });
});
