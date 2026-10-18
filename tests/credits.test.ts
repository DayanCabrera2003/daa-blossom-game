import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import strings from '../src/content/es/strings.json';
import { creditLines, OWN_PACK, type CreditLine } from '../src/game/assets/creditsModel';
import { assetEntry, packCredit, packCredits } from '../src/game/assets/keys';
import { BOOT_KEYS, groupKeys } from '../src/game/assets/loadPlan';
import { LIBRARY_CREDITS } from '../src/game/assets/libraryCredits';
import { CREDITS_ROLL, rollLines, rollTravel } from '../src/game/picture/creditsRoll';
import { CANVAS_WIDTH } from '../src/game/scale/integerZoom';
import { createTranslator } from '../src/services/i18n';
import { MATHEMATICS } from './support/vocabulary';

// The credits screen and CREDITS.md say the same (plan 09, phase 3): every pack, font and library
// the file credits is on the screen with its author and its license, and the screen names no one
// the file does not. The file is read here, so neither can change without the other.

const CREDITS = readFileSync(fileURLToPath(new URL('../CREDITS.md', import.meta.url)), 'utf8');
const t = createTranslator(strings);
const lines = creditLines(t);

/** A credited party of the file: its heading and the text of its section. */
interface Section {
  readonly name: string;
  readonly body: string;
}

/** The sections of `text` under headings of `marks` (`## ` or `### `). */
const sectionsOf = (text: string, marks: string): Section[] =>
  text
    .split(new RegExp(`^${marks} `, 'm'))
    .slice(1)
    .map((part) => ({ name: part.slice(0, part.indexOf('\n')).trim(), body: part }));

/** The value of a `- Field: value` line of a section. */
const field = (section: Section, names: readonly string[]): string | undefined =>
  names
    .map((name) => new RegExp(`^- ${name}: (.+)$`, 'm').exec(section.body)?.[1])
    .find((value) => value !== undefined);

const LIBRARIES = 'Libraries';
const top = sectionsOf(CREDITS, '##');
const libraries = sectionsOf(top.find((section) => section.name === LIBRARIES)?.body ?? '', '###');
/** Every third party of the file: its packs (not the own work) and its libraries. */
const thirdParties = [
  ...top.filter(({ name }) => name !== LIBRARIES && name !== packCredit(OWN_PACK).name),
  ...libraries,
];

/** The three lines the screen gives the credit named `name`, or [] if it does not show it. */
const shown = (name: string): CreditLine[] => {
  const at = lines.findIndex((line) => line.style === 'name' && line.text === name);
  return at < 0 ? [] : lines.slice(at, at + 3);
};

describe('the credits screen says what CREDITS.md says', () => {
  it('reads the third parties of the file: seven packs and five libraries', () => {
    expect(thirdParties.map(({ name }) => name)).toHaveLength(12);
    expect(libraries.map(({ name }) => name).sort()).toEqual(
      LIBRARY_CREDITS.map(({ name }) => name).sort(),
    );
  });

  it.each(thirdParties.map((section) => [section.name, section] as const))(
    '%s is on the screen with the author and the license the file gives it',
    (name, section) => {
      const author = field(section, ['Author', 'Authors']);
      const license = field(section, ['License']);
      const [, authorLine, licenseLine] = shown(name);
      expect(authorLine).toEqual({ style: 'text', text: author });
      // The file may follow a license with its page; the screen gives its name.
      expect(licenseLine?.style).toBe('text');
      const named = (licenseLine as { text: string } | undefined)?.text ?? '';
      expect(license?.startsWith(named.slice(named.indexOf(': ') + 2))).toBe(true);
    },
  );

  it('names no one the file does not credit', () => {
    const credited = new Set(thirdParties.map(({ name }) => name));
    const names = lines.flatMap((line) => (line.style === 'name' ? [line.text] : []));
    expect(names.filter((name) => !credited.has(name))).toEqual([]);
  });

  it("credits the own work with the file's author and license", () => {
    const own = top.find((section) => section.name === packCredit(OWN_PACK).name);
    expect(own).toBeDefined();
    const texts = lines.flatMap((line) => (line.style === 'gap' ? [] : [line.text]));
    expect(texts).toContain(field(own as Section, ['Author']));
    expect(texts).toContain(
      t('credits.license', { license: field(own as Section, ['License']) ?? '' }),
    );
  });

  it('every pack of the manifest has its section in the file', () => {
    const headings = top.map(({ name }) => name);
    for (const pack of packCredits()) expect(headings).toContain(pack.name);
  });
});

describe('the words of the credits screen', () => {
  it("speaks with the garden's words: no mathematics on it", () => {
    const texts = lines.flatMap((line) => (line.style === 'gap' ? [] : [line.text]));
    expect(texts.filter((text) => MATHEMATICS.test(text))).toEqual([]);
  });

  it("signs with the author's byline: name, course and year", () => {
    expect(t('credits.byline')).toBe('Dayan — Diseño y Análisis de Algoritmos (DAA), 2026');
  });
});

/**
 * How long an Ogg Vorbis file plays, read from its bytes: the sample rate of its identification
 * header and the granule position (the samples played) of its last page.
 */
function oggSeconds(bytes: Buffer): number {
  const header = bytes.indexOf('\x01vorbis', 0, 'latin1');
  const rate = bytes.readUInt32LE(header + 12);
  const last = bytes.lastIndexOf('OggS', undefined, 'latin1');
  return Number(bytes.readBigUInt64LE(last + 6)) / rate;
}

describe('the roll of the credits screen', () => {
  const laid = rollLines(lines, CREDITS_ROLL.window.width);

  it('fits every line of the real credits in its window, in the real font, on the canvas', () => {
    const { x, width } = CREDITS_ROLL.window;
    expect(x + width).toBeLessThanOrEqual(CANVAS_WIDTH);
    const over = laid.filter((line) => line.x < 0 || line.x + line.width > width);
    expect(over.map((line) => line.text)).toEqual([]);
  });

  it('is longer than its window, so it has somewhere to roll', () => {
    expect(rollTravel(laid, CREDITS_ROLL.window.height)).toBeGreaterThan(0);
  });

  it('lasts what the music of the credits lasts, to the second', () => {
    const path = fileURLToPath(
      new URL(`../public/${assetEntry('music.credits').path}`, import.meta.url),
    );
    const seconds = oggSeconds(readFileSync(path));
    expect(Math.abs(seconds * 1000 - CREDITS_ROLL.durationMs)).toBeLessThan(1000);
  });
});

describe('the music of the credits screen', () => {
  it('is loaded when the credits first open, not before the hub', () => {
    expect(groupKeys('credits')).toEqual(['music.credits']);
    expect(BOOT_KEYS).not.toContain('music.credits');
  });
});
