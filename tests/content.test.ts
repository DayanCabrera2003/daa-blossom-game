import { TEXT_PARAMS } from '@content/keys';
import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { catalog } from '@levels/catalog';
import { CARD_IDS } from '@levels/cards/schema';
import { speakerOf, type Speaker } from '@game/systems/speaker';
import { buttonWordProblems } from '@levels/buttonWords';
import { notebookEchoProblems } from '@levels/notebookEcho';
import { referencedLines } from '@levels/lines';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MATHEMATICS } from './support/vocabulary';

const table: Record<string, string> = strings;
const lineTable: Record<string, string> = lines;

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

  it('a replayed «Terminé» tells what the gardener says, not a fact about the garden', () => {
    expect(table['diagram.event.declareDone']).toContain('dice que');
  });

  it('no text separates its words with the middle dot, which the pixel font draws raised', () => {
    const offending = Object.entries(table).filter(([, text]) => text.includes('·'));
    expect(offending).toEqual([]);
  });
});

describe('text files (content/es/*.json)', () => {
  /** The keys written more than once in a JSON object file: parsing keeps only the last copy. */
  const repeatedKeys = (file: string): string[] => {
    const raw = readFileSync(new URL(`../src/content/es/${file}`, import.meta.url), 'utf8');
    const keys = [...raw.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((match) => match[1] as string);
    return keys.filter((key, index) => keys.indexOf(key) !== index);
  };

  it('write each key once, so no text silently replaces another', () => {
    expect(repeatedKeys('strings.json')).toEqual([]);
    expect(repeatedKeys('lines.json')).toEqual([]);
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

  it('names the button its level shows: «Presentar» in the levels of certificates (GDD §5.2)', () => {
    const words = { done: table['hud.done'] ?? '', present: table['hud.present'] ?? '' };
    const wrong = catalog().flatMap((level) =>
      buttonWordProblems(level.data, (id) => lineTable[id], words),
    );
    expect(wrong).toEqual([]);
  });

  it('no notebook asks back, word for word, a line the player has just heard (GDD §5.5)', () => {
    const echoes = catalog().flatMap((level) =>
      notebookEchoProblems(level.data, (id) => lineTable[id]).map((problem) => ({
        level: level.data.id,
        ...problem,
      })),
    );
    expect(echoes).toEqual([]);
  });

  it("the Council's count, from 7.2 on, waits for «Presentar» too", () => {
    expect(table['hud.councilHidden']).toContain(`«${table['hud.present'] ?? ''}»`);
  });

  it('no line separates its words with the middle dot, which the pixel font draws raised', () => {
    const offending = Object.entries(lineTable).filter(([, text]) => text.includes('·'));
    expect(offending).toEqual([]);
  });

  it('no level lets a character speak before the chapter that introduces him', () => {
    /** The chapter of a level id, such as 4 for `4.13`. */
    const chapterOf = (id: string): number => Number(id.split('.')[0]);
    // A character is introduced by the first level of the main path that gives him a line: a
    // secret flower is optional and may be played before later chapters, so it introduces no one.
    const introduced = new Map<Speaker, number>();
    for (const level of catalog().filter((candidate) => candidate.data.secret === undefined)) {
      for (const speaker of referencedLines(level.data).map(speakerOf)) {
        const chapter = chapterOf(level.data.id);
        introduced.set(speaker, Math.min(chapter, introduced.get(speaker) ?? chapter));
      }
    }
    const early = catalog().flatMap((level) =>
      referencedLines(level.data).filter(
        (id) => (introduced.get(speakerOf(id)) ?? Infinity) > chapterOf(level.data.id),
      ),
    );
    expect(early).toEqual([]);
  });
});

/**
 * Words that explain what a mechanic means or achieves: a card shows the gesture, never the idea
 * (GDD §5.11, principles 1, 2 and 4); the player discovers the meaning and Sauce names it later.
 */
const IDEA =
  /\bporque\b|\bpor qu[ée]\b|\bpara que\b|m[áa]xim|[óo]ptim|demuestr|garantiz|\bsiempre\b/i;

describe('mechanic cards (content/es/strings.json, GDD §5.11)', () => {
  const cardTexts = CARD_IDS.flatMap((id) => [`tutorial.${id}.title`, `tutorial.${id}.body`]);

  it('every card has a title and a body', () => {
    expect(cardTexts.filter((key) => !table[key])).toEqual([]);
  });

  it('tells the gesture, never the idea: no mathematics and no reason why', () => {
    const offending = cardTexts.filter((key) => {
      const text = table[key] ?? '';
      return MATHEMATICS.test(text) || IDEA.test(text);
    });
    expect(offending).toEqual([]);
  });

  it('keeps each body to a few short lines', () => {
    expect(CARD_IDS.filter((id) => (table[`tutorial.${id}.body`] ?? '').length > 180)).toEqual([]);
  });
});
