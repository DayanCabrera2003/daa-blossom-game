// The weight budget of the shipped game (plan 06, phase 11; the deferred books, plan 07, phase 2):
// how many bytes each part may take, and how the parts are weighed from the asset manifest and
// the built files.
import type { AssetKind, Manifest } from '../../src/game/assets/manifestSchema';

/** Decimal units, as browsers and `du --si` report sizes: the stricter reading of "MB". */
const KB = 1000;
const MB = 1000 * KB;

/** A part of the budget: the JavaScript, the assets by kind, and what the first screen waits for. */
export type BudgetPart = 'js' | 'images' | 'fonts' | 'sounds' | 'initial' | 'music' | 'codex';

/** The most bytes each part may take. */
export const BUDGET: Readonly<Record<BudgetPart, number>> = {
  // The initial script: the entry and what it imports statically (the books load later).
  js: 1.8 * MB,
  images: 600 * KB,
  fonts: 100 * KB,
  // Effects, babble syllables and jingles.
  sounds: 1.5 * MB,
  // The initial script plus the boot group, the hub's music among it; never the deferred books.
  initial: 5 * MB,
  // Every track, though each is loaded with its own chapter.
  music: 20 * MB,
  // The books, loaded on demand: KaTeX, marked, their stylesheets, KaTeX's woff2 fonts, the
  // entries, the diagrams and the teacher's panel. Settled at the close of plan 07, when all
  // fourteen entries weighed 873 KB: about an eighth to spare, no more.
  codex: 1 * MB,
};

/** The asset kinds weighed under each part of the budget that the manifest alone decides. */
const PARTS_BY_KIND: Readonly<Record<'images' | 'fonts' | 'sounds' | 'music', AssetKind[]>> = {
  images: ['image', 'sheet'],
  fonts: ['font'],
  sounds: ['sfx', 'voice', 'jingle'],
  music: ['music'],
};

/** What the manifest weighs: each part by kind, and the boot group the first screen waits for. */
export interface ManifestSizes {
  readonly images: number;
  readonly fonts: number;
  readonly sounds: number;
  readonly music: number;
  readonly boot: number;
}

/** Sums the bytes of the manifest's entries for each part of the budget and for the boot group. */
export function manifestSizes(manifest: Manifest): ManifestSizes {
  const entries = Object.values(manifest.assets);
  const sum = (keep: (entry: (typeof entries)[number]) => boolean): number =>
    entries.filter(keep).reduce((total, entry) => total + entry.bytes, 0);
  const ofKinds = (kinds: AssetKind[]): number => sum((entry) => kinds.includes(entry.kind));
  return {
    images: ofKinds(PARTS_BY_KIND.images),
    fonts: ofKinds(PARTS_BY_KIND.fonts),
    sounds: ofKinds(PARTS_BY_KIND.sounds),
    music: ofKinds(PARTS_BY_KIND.music),
    boot: sum((entry) => entry.group === 'boot'),
  };
}

/** One line of the report: a part, what it weighs, its limit and whether it goes over. */
export interface BudgetRow {
  readonly part: BudgetPart;
  readonly bytes: number;
  readonly limit: number;
  readonly over: boolean;
}

/** What the build weighs: the initial script and the deferred books, as `buildFiles` sorts them. */
export interface BuildSizes {
  readonly js: number;
  readonly codex: number;
}

/** Every part of the budget, weighed from the manifest's sizes and the built files. */
export function budgetReport(sizes: ManifestSizes & BuildSizes): BudgetRow[] {
  const weights: Record<BudgetPart, number> = {
    js: sizes.js,
    images: sizes.images,
    fonts: sizes.fonts,
    sounds: sizes.sounds,
    initial: sizes.js + sizes.boot,
    music: sizes.music,
    codex: sizes.codex,
  };
  return (Object.keys(BUDGET) as BudgetPart[]).map((part) => ({
    part,
    bytes: weights[part],
    limit: BUDGET[part],
    over: weights[part] > BUDGET[part],
  }));
}
