/**
 * The libraries and fonts the game ships that are not in the asset manifest (plan 09, phase 3):
 * the engine and the checker of files with the game, the Codex's typesetting, its fonts and its
 * Markdown when a book opens. Written as `CREDITS.md` names them, word for word, so the credits
 * screen and that file cannot drift apart: `tests/credits.test.ts` reads the file and holds the
 * two to each other.
 */

/** A section of the credits screen a library is listed under. */
export type LibrarySection = 'font' | 'software';

/** A library as the credits name it: its name, its authors and its license, and where it goes. */
export interface LibraryCredit {
  readonly name: string;
  readonly author: string;
  readonly license: string;
  readonly section: LibrarySection;
}

/** Every library and font of `CREDITS.md`'s "Libraries", in the order the screen lists them. */
export const LIBRARY_CREDITS: readonly LibraryCredit[] = [
  {
    name: 'Phaser',
    author: 'Richard Davey and Phaser Studio Inc.',
    license: 'MIT',
    section: 'software',
  },
  { name: 'Zod', author: 'Colin McDonnell', license: 'MIT', section: 'software' },
  {
    name: 'KaTeX',
    author: 'Khan Academy and the KaTeX contributors',
    license: 'MIT',
    section: 'software',
  },
  {
    name: 'marked',
    author: 'MarkedJS and Christopher Jeffrey',
    license: 'MIT',
    section: 'software',
  },
  {
    name: 'KaTeX fonts',
    author: 'Design Science, Inc. (the MathJax fonts, 2009-2010) and Khan Academy (2014-2018)',
    license: 'SIL Open Font License 1.1',
    section: 'font',
  },
];
