import { describe, expect, it } from 'vitest';
import type { Manifest, ManifestEntry } from '../src/game/assets/manifestSchema';
import { BUDGET, budgetReport, manifestSizes } from '../tools/assets/budget';

/** One manifest entry of the given kind, group and size; the rest does not matter here. */
const entry = (
  kind: ManifestEntry['kind'],
  group: ManifestEntry['group'],
  bytes: number,
): ManifestEntry => ({
  path: `assets/${kind}-${group}-${bytes}`,
  kind,
  group,
  pack: 'test',
  source: 'x',
  bytes,
  sha256: '0'.repeat(64),
});

const MANIFEST: Manifest = {
  packs: {
    test: { name: 'T', version: null, author: 'A', license: 'CC0-1.0', url: 'https://e.org' },
  },
  assets: {
    a: entry('image', 'boot', 100),
    b: entry('sheet', 'boot', 200),
    c: entry('font', 'boot', 30),
    d: entry('sfx', 'boot', 5),
    e: entry('voice', 'boot', 6),
    f: entry('jingle', 'boot', 7),
    g: entry('music', 'boot', 1000),
    h: entry('music', 'ch1', 2000),
    i: entry('music', 'credits', 4000),
  },
};

describe('manifestSizes', () => {
  it('sums the bytes of each part of the budget by kind, and the boot group apart', () => {
    expect(manifestSizes(MANIFEST)).toEqual({
      images: 300,
      fonts: 30,
      sounds: 18,
      music: 7000,
      boot: 1348,
    });
  });
});

describe('budgetReport', () => {
  it('weighs the initial load as the JavaScript plus the boot group', () => {
    const report = budgetReport({ ...manifestSizes(MANIFEST), js: 500 });
    expect(report.find((row) => row.part === 'initial')).toEqual({
      part: 'initial',
      bytes: 1848,
      limit: BUDGET.initial,
      over: false,
    });
  });

  it('flags every part over its limit, and only those', () => {
    const report = budgetReport({
      js: BUDGET.js + 1,
      images: BUDGET.images,
      fonts: 0,
      sounds: 0,
      music: BUDGET.music + 1,
      boot: 0,
    });
    expect(report.filter((row) => row.over).map((row) => row.part)).toEqual(['js', 'music']);
  });

  it('leaves room in the initial load for the whole JavaScript budget', () => {
    // The tests see the manifest but not the build: a boot group within this bound keeps the
    // initial load within budget as long as the JavaScript keeps within its own.
    expect(BUDGET.initial - BUDGET.js).toBeGreaterThan(0);
  });
});
