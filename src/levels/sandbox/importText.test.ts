import { encodeGarden } from '@core/codes/gardenCode';
import { completeGraph, pathGraph } from '@core/generators/families';
import { randomGraph } from '@core/generators/random';
import { createRng } from '@core/shared/rng';
import { emptyMatching } from '@core/matching/createMatching';
import { unwrap } from '@core/shared/result';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { designArb } from '../../../tests/support/designs';
import { LAYOUT_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { buildGarden } from '../garden';
import { checkLayout } from '../layoutChecks';
import { SPROUT_AREA } from '../fields';
import type { Design } from './design';
import { EDITOR_AREA } from './editorArea';
import { importText } from './importText';
import { MAX_IMPORT_LENGTH, MIN_SPACING } from './limits';
import { toLevelFile } from './toLevel';

/** The garden code of a design: its garden and its lanterns, without places nor names. */
function codeOf(design: Design): string {
  const { graph, matching } = unwrap(
    buildGarden({
      names: design.sprouts.map((sprout) => sprout.label),
      vines: design.vines,
      lanterns: design.lanterns,
    }),
  );
  return encodeGarden(graph, matching);
}

/** A path A–B–C with A=B lit. */
const SMALL: Design = {
  sprouts: [
    { label: 'A', x: 60, y: 100 },
    { label: 'B', x: 120, y: 100 },
    { label: 'C', x: 180, y: 100 },
  ],
  vines: [
    ['A', 'B'],
    ['B', 'C'],
  ],
  lanterns: [['A', 'B']],
};

describe('importing a text into the free mode', () => {
  it('reads a level file: its garden, places and names, nothing else', () => {
    const json = JSON.stringify({ ...toLevelFile(SMALL), hints: [] }, null, 2);
    expect(importText(json)).toEqual({ ok: true, value: SMALL });
  });

  it('keeps the bees and flowers of a level file', () => {
    const sides: Design = {
      ...SMALL,
      sprouts: SMALL.sprouts.map((sprout, i) => ({
        ...sprout,
        kind: i % 2 === 0 ? 'bee' : 'flower',
      })),
    };
    expect(importText(JSON.stringify(toLevelFile(sides)))).toEqual({ ok: true, value: sides });
  });

  it("moves a level file's garden under the editor's header down into its free area", () => {
    const high: Design = {
      ...SMALL,
      sprouts: SMALL.sprouts.map((sprout, i) => ({ ...sprout, y: 30 + 20 * i })),
    };
    const imported = unwrap(importText(JSON.stringify(toLevelFile(high))));
    const ys = imported.sprouts.map((sprout) => sprout.y);
    expect(ys).toEqual([EDITOR_AREA.y0, EDITOR_AREA.y0 + 20, EDITOR_AREA.y0 + 40]);
    expect(imported.sprouts.map((sprout) => sprout.x)).toEqual(SMALL.sprouts.map((s) => s.x));
    expect(imported.vines).toEqual(high.vines);
  });

  it('reads a garden code, laid out and named A, B, C…', () => {
    const imported = unwrap(importText(`  ${codeOf(SMALL)}\n`));
    expect(imported.sprouts.map((sprout) => sprout.label)).toEqual(['A', 'B', 'C']);
    expect(imported.vines).toEqual(SMALL.vines);
    expect(imported.lanterns).toEqual(SMALL.lanterns);
    expect(codeOf(imported)).toBe(codeOf(SMALL));
  });

  it('refuses a text longer than 64 KB without reading it', () => {
    expect(MAX_IMPORT_LENGTH).toBe(64 * 1024);
    expect(importText(' '.repeat(65 * 1024))).toEqual({ ok: false, error: 'tooLong' });
  });

  it('says why a broken text is no garden, and never throws', () => {
    const json = JSON.stringify(toLevelFile(SMALL));
    expect(importText(json.slice(0, json.length / 2))).toEqual({ ok: false, error: 'badJson' });
    expect(importText('{"id": "9.1"}')).toEqual({ ok: false, error: 'badLevel' });
    expect(importText('[1, 2]')).toEqual({ ok: false, error: 'badLevel' });
    // A vine to a sprout the file does not have.
    expect(importText(JSON.stringify({ ...toLevelFile(SMALL), vines: [['A', 'Z']] }))).toEqual({
      ok: false,
      error: 'badLevel',
    });
    expect(importText('')).toEqual({ ok: false, error: 'badCode' });
    expect(importText('not a code!')).toEqual({ ok: false, error: 'badCode' });
    expect(importText('123')).toEqual({ ok: false, error: 'badCode' });
    // A code with bits to spare after its garden: canonical codes never have any.
    expect(importText(`${codeOf(SMALL)}AAAA`)).toEqual({ ok: false, error: 'badCode' });
  });

  it('holds what it reads to the limits of the free mode', () => {
    const crowded = {
      ...toLevelFile(SMALL),
      sprouts: SMALL.sprouts.map((sprout, i) => ({ ...sprout, x: 60 + (MIN_SPACING - 1) * i })),
    };
    expect(importText(JSON.stringify(crowded))).toEqual({ ok: false, error: 'tooClose' });
    const many = {
      ...toLevelFile(SMALL),
      sprouts: Array.from({ length: 25 }, (_, i) => ({
        label: `S${i}`,
        x: SPROUT_AREA.x0 + 18 * i,
        y: 100,
      })),
      vines: [],
      lanterns: [],
      solution: [{ type: 'declareDone' }],
    };
    expect(importText(JSON.stringify(many))).toEqual({ ok: false, error: 'tooMany' });
    expect(importText(encodeGarden(pathGraph(25), emptyMatching(pathGraph(25))))).toEqual({
      ok: false,
      error: 'tooMany',
    });
    // Ten sprouts all joined: 45 vines.
    expect(importText(encodeGarden(completeGraph(10), emptyMatching(completeGraph(10))))).toEqual({
      ok: false,
      error: 'tooManyVines',
    });
  });

  it('property: the exported file comes back as the same design', () => {
    fc.assert(
      fc.property(designArb(), (design) => {
        expect(importText(JSON.stringify(toLevelFile(design)))).toEqual({
          ok: true,
          value: design,
        });
      }),
      { numRuns: 120 },
    );
  });

  it(
    'property: the code comes back as the same garden with the same lanterns',
    () => {
      fc.assert(
        fc.property(designArb(), (design) => {
          const code = codeOf(design);
          const imported = importText(code);
          expect(imported.ok).toBe(true);
          if (imported.ok) expect(codeOf(imported.value)).toBe(code);
        }),
        { numRuns: 120 },
      );
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it(
    'property: a garden read from a code is laid out with every name readable',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 24 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer(),
          (n, chance, seed) => {
            // About 48 vines at the most likely, so the limit of 40 skips few gardens.
            const p = chance * Math.min(0.6, 96 / Math.max(1, n * (n - 1)));
            const graph = randomGraph(n, p, createRng(seed));
            fc.pre(graph.edges.length <= 40);
            const imported = importText(encodeGarden(graph, emptyMatching(graph)));
            expect(imported.ok).toBe(true);
            if (imported.ok) expect(checkLayout(imported.value)).toEqual([]);
          },
        ),
        { numRuns: 120 },
      );
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it('property: any text gives a design or a reason, never an exception', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json(), fc.base64String()), (text) => {
        expect(typeof importText(text).ok).toBe('boolean');
      }),
      { numRuns: 300 },
    );
  });
});
