import { describe, expect, it } from 'vitest';
import strings from '@content/es/strings.json';
import { createTranslator } from '@services/i18n';
import { creditLines, creditsBySection, CREDIT_SECTIONS, OWN_PACK } from './creditsModel';
import { packCredit, packCredits } from './keys';
import { LIBRARY_CREDITS } from './libraryCredits';

const t = createTranslator(strings);

/** The texts of the lines of the screen, gaps left out. */
const texts = (): string[] =>
  creditLines(t).flatMap((line) => (line.style === 'gap' ? [] : [line.text]));

describe('who the credits screen thanks, by section', () => {
  const sections = creditsBySection();

  it('sorts the packs by what the game takes from them: the Ninja pack is in art, music and sound', () => {
    const named = (section: (typeof CREDIT_SECTIONS)[number]): string[] =>
      sections[section].map((credit) => credit.name);
    expect(named('art')).toEqual([
      'Ninja Adventure Asset Pack',
      'Tiny Town',
      'UI Pack - Pixel Adventure',
    ]);
    expect(named('music')).toEqual(['Ninja Adventure Asset Pack', 'Music Jingles']);
    expect(named('sound')).toEqual(['Ninja Adventure Asset Pack', 'Interface Sounds', 'RPG Audio']);
    expect(named('font')).toEqual(['monogram', 'KaTeX fonts']);
    expect(named('software')).toEqual(['Phaser', 'Zod', 'KaTeX', 'marked']);
  });

  it("leaves the project's own work out of the third parties' sections", () => {
    const own = packCredit(OWN_PACK).name;
    for (const section of CREDIT_SECTIONS) {
      expect(sections[section].map((credit) => credit.name)).not.toContain(own);
    }
  });

  it('names every pack of the manifest but the own work, and every library, somewhere', () => {
    const named = new Set(CREDIT_SECTIONS.flatMap((s) => sections[s].map((c) => c.name)));
    const expected = [
      ...packCredits().filter((pack) => pack !== packCredit(OWN_PACK)),
      ...LIBRARY_CREDITS,
    ].map((credit) => credit.name);
    expect([...named].sort()).toEqual([...new Set(expected)].sort());
  });
});

describe('the lines of the credits screen', () => {
  const lines = creditLines(t);

  it('opens with the title of the game, large, and the signature under it', () => {
    expect(lines[0]).toEqual({ style: 'title', text: t('hub.title') });
    expect(lines[1]).toEqual({ style: 'text', text: t('credits.byline') });
  });

  it('heads each section with its word, and closes with the thanks', () => {
    const headings = lines.flatMap((line) => (line.style === 'heading' ? [line.text] : []));
    expect(headings).toEqual([
      ...CREDIT_SECTIONS.map((section) => t(`credits.${section}`)),
      t('credits.own'),
    ]);
    expect(lines.at(-1)).toEqual({ style: 'text', text: t('credits.thanks') });
  });

  it('gives each credit its name, its author and its license, in that order', () => {
    const at = lines.findIndex((line) => line.style === 'name' && line.text === 'Tiny Town');
    expect(lines.slice(at, at + 3)).toEqual([
      { style: 'name', text: 'Tiny Town' },
      { style: 'text', text: 'Kenney' },
      { style: 'text', text: t('credits.license', { license: 'CC0-1.0' }) },
    ]);
  });

  it('credits the own work under its own heading, with its author, license and what it is', () => {
    const own = packCredit(OWN_PACK);
    const at = lines.findIndex(
      (line) => line.style === 'heading' && line.text === t('credits.own'),
    );
    expect(lines.slice(at + 1, at + 4)).toEqual([
      { style: 'text', text: t('credits.ownWork') },
      { style: 'text', text: own.author },
      { style: 'text', text: t('credits.license', { license: own.license }) },
    ]);
  });

  it('every text is written: no key is missing', () => {
    expect(texts().filter((text) => text.includes('‹') || text.trim() === '')).toEqual([]);
  });

  it('never starts nor ends with a gap, nor puts two gaps together', () => {
    expect(lines[0]?.style).not.toBe('gap');
    expect(lines.at(-1)?.style).not.toBe('gap');
    lines.forEach((line, i) => {
      if (line.style === 'gap') expect(lines[i + 1]?.style).not.toBe('gap');
    });
  });
});
