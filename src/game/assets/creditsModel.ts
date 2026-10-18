import type { Translate } from '@services/i18n';
import { ASSET_KEYS, assetEntry, packCredit, packCredits } from './keys';
import { LIBRARY_CREDITS } from './libraryCredits';
import type { AssetKind } from './manifestSchema';

/**
 * What the credits screen says (plan 09, phase 3), decided without Phaser: the title of the game
 * and the author's signature, then every third party the game owes something to, sorted by what
 * it gives, each with its name, its authors and its license; the project's own work; and the
 * thanks. The packs come from the asset manifest (which `tools/assets/selection.ts` writes, the
 * same source `CREDITS.md` is checked against) and sit in each section where the game uses one of
 * their files; the libraries come from `libraryCredits.ts`. Proper names are shown as their
 * authors wrote them; every other word is a key of `strings.json`.
 */

/** The sections of third parties, in the order the screen shows them. */
export const CREDIT_SECTIONS = ['art', 'music', 'sound', 'font', 'software'] as const;
export type CreditSection = (typeof CREDIT_SECTIONS)[number];

/** The pack of the manifest that is the project's own work, credited apart from third parties. */
export const OWN_PACK = 'own';

/** The section a file of each kind is credited under. */
const SECTION_OF_KIND: Readonly<Record<AssetKind, CreditSection>> = {
  image: 'art',
  sheet: 'art',
  music: 'music',
  jingle: 'music',
  sfx: 'sound',
  voice: 'sound',
  font: 'font',
  // The page's icon is a picture of a pack like any other.
  icon: 'art',
};

/** One credited third party: its name, its authors and its license, as its credits give them. */
export interface Credit {
  readonly name: string;
  readonly author: string;
  readonly license: string;
}

/**
 * The third parties of each section: the packs the game takes a file of that kind from, in the
 * manifest's order, then the libraries of that section in theirs. The own work is in none.
 */
export function creditsBySection(): Readonly<Record<CreditSection, readonly Credit[]>> {
  const sections = Object.fromEntries(
    CREDIT_SECTIONS.map((section) => [section, [] as Credit[]]),
  ) as Record<CreditSection, Credit[]>;
  const own = packCredit(OWN_PACK);
  for (const pack of packCredits()) {
    if (pack === own) continue;
    const used = new Set(
      ASSET_KEYS.map(assetEntry)
        .filter((entry) => packCredit(entry.pack) === pack)
        .map((entry) => SECTION_OF_KIND[entry.kind]),
    );
    for (const section of CREDIT_SECTIONS) if (used.has(section)) sections[section].push(pack);
  }
  for (const library of LIBRARY_CREDITS) sections[library.section].push(library);
  return sections;
}

/** How a line of the screen is drawn: the game's title, a section's heading, a name, plain text. */
export type CreditStyle = 'title' | 'heading' | 'name' | 'text';

/** A line of the screen, not yet wrapped, or a blank line between groups. */
export type CreditLine =
  { readonly style: CreditStyle; readonly text: string } | { readonly style: 'gap' };

const GAP: CreditLine = { style: 'gap' };

/** A credit's lines: its name, its authors and its license. */
const creditOf = (t: Translate, credit: Credit): CreditLine[] => [
  { style: 'name', text: credit.name },
  { style: 'text', text: credit.author },
  { style: 'text', text: t('credits.license', { license: credit.license }) },
];

/**
 * The lines of the screen, top to bottom: the title and the signature (`credits.byline`, which the
 * author may change), each section with its heading and its credits a blank line apart, the own
 * work (what it is, its author and license) and, last, the thanks.
 */
export function creditLines(t: Translate): CreditLine[] {
  const sections = creditsBySection();
  const own = packCredit(OWN_PACK);
  return [
    { style: 'title', text: t('hub.title') },
    { style: 'text', text: t('credits.byline') },
    ...CREDIT_SECTIONS.flatMap((section): CreditLine[] => [
      GAP,
      { style: 'heading', text: t(`credits.${section}`) },
      ...sections[section].flatMap((credit, i) => [
        ...(i === 0 ? [] : [GAP]),
        ...creditOf(t, credit),
      ]),
    ]),
    GAP,
    { style: 'heading', text: t('credits.own') },
    { style: 'text', text: t('credits.ownWork') },
    { style: 'text', text: own.author },
    { style: 'text', text: t('credits.license', { license: own.license }) },
    GAP,
    { style: 'text', text: t('credits.thanks') },
  ];
}
