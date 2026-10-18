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
      deployed: 7348,
    });
  });

  it('with fallbacks, weighs what one browser fetches: the larger file of each sound', () => {
    const fallbacks = {
      encoder: 'ffmpeg 7.1.5',
      files: {
        // A fallback heavier than its original, and two lighter.
        d: { path: 'assets/d.m4a', from: '0'.repeat(64), bytes: 9 },
        g: { path: 'assets/g.m4a', from: '0'.repeat(64), bytes: 800 },
        h: { path: 'assets/h.m4a', from: '0'.repeat(64), bytes: 1500 },
      },
    };
    expect(manifestSizes(MANIFEST, fallbacks)).toEqual({
      images: 300,
      fonts: 30,
      sounds: 22,
      music: 7000,
      boot: 1352,
      // The deployment holds both files of each sound.
      deployed: 7348 + 9 + 800 + 1500,
    });
  });
});

describe('budgetReport', () => {
  it('weighs the initial load as the JavaScript plus the boot group', () => {
    const report = budgetReport({ ...manifestSizes(MANIFEST), js: 500, codex: 9000, sandbox: 70 });
    expect(report.find((row) => row.part === 'initial')).toEqual({
      part: 'initial',
      bytes: 1848,
      limit: BUDGET.initial,
      over: false,
    });
    // Settled once the hub's music left the first load (plan 09, phase 9): 3115 KB measured.
    expect(BUDGET.initial).toBe(3.5e6);
  });

  it('weighs the deferred books apart, out of the initial load', () => {
    const report = budgetReport({ ...manifestSizes(MANIFEST), js: 500, codex: 9000, sandbox: 70 });
    expect(report.find((row) => row.part === 'codex')).toEqual({
      part: 'codex',
      bytes: 9000,
      limit: BUDGET.codex,
      over: false,
    });
    expect(BUDGET.codex).toBe(1e6);
  });

  it('weighs the free mode in a part of its own, apart from the books and the start', () => {
    const report = budgetReport({ ...manifestSizes(MANIFEST), js: 500, codex: 9000, sandbox: 70 });
    expect(report.find((row) => row.part === 'sandbox')).toEqual({
      part: 'sandbox',
      bytes: 70,
      limit: BUDGET.sandbox,
      over: false,
    });
    expect(report.find((row) => row.part === 'codex')?.bytes).toBe(9000);
    expect(report.find((row) => row.part === 'initial')?.bytes).toBe(1848);
    expect(BUDGET.sandbox).toBe(60e3);
  });

  it('flags every part over its limit, and only those', () => {
    const report = budgetReport({
      js: BUDGET.js + 1,
      codex: BUDGET.codex + 1,
      sandbox: BUDGET.sandbox + 1,
      images: BUDGET.images,
      fonts: 0,
      sounds: 0,
      music: BUDGET.music + 1,
      boot: 0,
    });
    expect(report.filter((row) => row.over).map((row) => row.part)).toEqual([
      'js',
      'music',
      'codex',
      'sandbox',
    ]);
  });

  it('leaves room in the initial load for the whole JavaScript budget', () => {
    // The tests see the manifest but not the build: a boot group within this bound keeps the
    // initial load within budget as long as the JavaScript keeps within its own.
    expect(BUDGET.initial - BUDGET.js).toBeGreaterThan(0);
  });
});
