import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SPROUT_AREA } from '../fields';
import { checkLayout } from '../layoutChecks';
import { EMPTY_DESIGN, editDesign, limitBreach, type Design, type DesignEdit } from './design';
import { MAX_SPROUTS, MAX_VINES, MIN_SPACING } from './limits';
import { anyEdit } from '../../../tests/support/designs';

/** The design an edit gives, failing the test if it is refused. */
function edited(design: Design, ...edits: DesignEdit[]): Design {
  return edits.reduce((now, edit) => {
    const outcome = editDesign(now, edit);
    if (!outcome.ok) throw new Error(`refused: ${outcome.error}`);
    return outcome.value;
  }, design);
}

/** Three sprouts in a row, A–B joined and lit, B–C joined. */
const THREE = edited(
  EMPTY_DESIGN,
  { type: 'addSprout', x: 100, y: 100 },
  { type: 'addSprout', x: 140, y: 100 },
  { type: 'addSprout', x: 180, y: 100 },
  { type: 'toggleVine', u: 'A', v: 'B' },
  { type: 'toggleVine', u: 'B', v: 'C' },
  { type: 'toggleLantern', u: 'A', v: 'B' },
);

describe('the limits of the free mode', () => {
  it('hold 24 sprouts, 40 vines and 18 px between two sprouts', () => {
    expect([MAX_SPROUTS, MAX_VINES, MIN_SPACING]).toEqual([24, 40, 18]);
  });
});

describe('editing a design', () => {
  it('adds a sprout where the grass is touched, rounded to a pixel, with the next letter', () => {
    const design = edited(EMPTY_DESIGN, { type: 'addSprout', x: 50.4, y: 60.6 });
    expect(design.sprouts).toEqual([{ label: 'A', x: 50, y: 61 }]);
    expect(THREE.sprouts.map((sprout) => sprout.label)).toEqual(['A', 'B', 'C']);
  });

  it('refuses a sprout outside the garden or too close to another', () => {
    expect(editDesign(EMPTY_DESIGN, { type: 'addSprout', x: SPROUT_AREA.x0 - 1, y: 100 })).toEqual({
      ok: false,
      error: 'outside',
    });
    expect(editDesign(EMPTY_DESIGN, { type: 'addSprout', x: 100, y: SPROUT_AREA.y1 + 1 })).toEqual({
      ok: false,
      error: 'outside',
    });
    expect(editDesign(THREE, { type: 'addSprout', x: 117, y: 100 })).toEqual({
      ok: false,
      error: 'tooClose',
    });
    expect(editDesign(THREE, { type: 'addSprout', x: 100, y: 140 }).ok).toBe(true);
  });

  it('refuses a sprout, a move or a vine that would draw something over a name', () => {
    const coversName = { ok: false, error: 'coversName' };
    // Right under A, the new sprout would sit on A's name.
    expect(editDesign(THREE, { type: 'addSprout', x: 100, y: 124 })).toEqual(coversName);
    expect(editDesign(THREE, { type: 'moveSprout', label: 'C', x: 100, y: 124 })).toEqual(
      coversName,
    );
    // A vine from A to a sprout 40 px below hangs its lantern on A's name.
    const below = edited(THREE, { type: 'addSprout', x: 100, y: 140 });
    expect(editDesign(below, { type: 'toggleVine', u: 'A', v: 'D' })).toEqual(coversName);
    // Taking a vine away never covers anything.
    expect(editDesign(THREE, { type: 'toggleVine', u: 'A', v: 'B' }).ok).toBe(true);
  });

  it('lets a design that came with a covered name be edited, and the name be cleared', () => {
    const crowded: Design = {
      sprouts: [
        { label: 'A', x: 100, y: 100 },
        { label: 'B', x: 100, y: 122 },
      ],
      vines: [],
      lanterns: [],
    };
    expect(checkLayout(crowded)).not.toEqual([]);
    expect(editDesign(crowded, { type: 'addSprout', x: 300, y: 100 }).ok).toBe(true);
    const cleared = edited(crowded, { type: 'moveSprout', label: 'B', x: 160, y: 100 });
    expect(checkLayout(cleared)).toEqual([]);
  });

  it('refuses a sprout past the 24th', () => {
    const full = edited(
      EMPTY_DESIGN,
      ...Array.from({ length: MAX_SPROUTS }, (_, i): DesignEdit => ({
        type: 'addSprout',
        x: 20 + 20 * (i % 12),
        y: 40 + 40 * Math.floor(i / 12),
      })),
    );
    expect(full.sprouts).toHaveLength(MAX_SPROUTS);
    expect(editDesign(full, { type: 'addSprout', x: 300, y: 200 })).toEqual({
      ok: false,
      error: 'tooMany',
    });
  });

  it('moves a sprout, but not outside, too close to another, nor one that is not there', () => {
    const moved = edited(THREE, { type: 'moveSprout', label: 'C', x: 180, y: 150 });
    expect(moved.sprouts[2]).toEqual({ label: 'C', x: 180, y: 150 });
    expect(editDesign(THREE, { type: 'moveSprout', label: 'C', x: 150, y: 100 })).toEqual({
      ok: false,
      error: 'tooClose',
    });
    expect(editDesign(THREE, { type: 'moveSprout', label: 'C', x: 180, y: 300 })).toEqual({
      ok: false,
      error: 'outside',
    });
    expect(editDesign(THREE, { type: 'moveSprout', label: 'Z', x: 300, y: 100 })).toEqual({
      ok: false,
      error: 'noSprout',
    });
    // A sprout may stay where it is.
    expect(editDesign(THREE, { type: 'moveSprout', label: 'B', x: 140, y: 100 }).ok).toBe(true);
  });

  it('removes a sprout with its vines and lanterns, and frees its letter', () => {
    const removed = edited(THREE, { type: 'removeSprout', label: 'B' });
    expect(removed.sprouts.map((sprout) => sprout.label)).toEqual(['A', 'C']);
    expect(removed.vines).toEqual([]);
    expect(removed.lanterns).toEqual([]);
    expect(edited(removed, { type: 'addSprout', x: 300, y: 100 }).sprouts[2]?.label).toBe('B');
    expect(editDesign(THREE, { type: 'removeSprout', label: 'Z' })).toEqual({
      ok: false,
      error: 'noSprout',
    });
  });

  it('grows a vine between two sprouts and takes it away the second time, lantern and all', () => {
    expect(THREE.vines).toEqual([
      ['A', 'B'],
      ['B', 'C'],
    ]);
    const cut = edited(THREE, { type: 'toggleVine', u: 'B', v: 'A' });
    expect(cut.vines).toEqual([['B', 'C']]);
    expect(cut.lanterns).toEqual([]);
    expect(editDesign(THREE, { type: 'toggleVine', u: 'A', v: 'A' })).toEqual({
      ok: false,
      error: 'sameSprout',
    });
    expect(editDesign(THREE, { type: 'toggleVine', u: 'A', v: 'Z' })).toEqual({
      ok: false,
      error: 'noSprout',
    });
  });

  it('refuses the 41st vine', () => {
    // 10 sprouts hold 45 possible vines; the first 40 of them grow.
    const ten = edited(
      EMPTY_DESIGN,
      ...Array.from({ length: 10 }, (_, i): DesignEdit => ({
        type: 'addSprout',
        x: 20 + 30 * i,
        y: 100,
      })),
    );
    const pairs = ten.sprouts.flatMap((u, i) =>
      ten.sprouts
        .slice(i + 1)
        .map((v): DesignEdit => ({ type: 'toggleVine', u: u.label, v: v.label })),
    );
    const full = edited(ten, ...pairs.slice(0, MAX_VINES));
    expect(full.vines).toHaveLength(MAX_VINES);
    const next = pairs[MAX_VINES];
    expect(next === undefined ? null : editDesign(full, next)).toEqual({
      ok: false,
      error: 'tooManyVines',
    });
  });

  it('lights a vine, puts it out the second time, and never two lanterns on a sprout', () => {
    expect(THREE.lanterns).toEqual([['A', 'B']]);
    expect(edited(THREE, { type: 'toggleLantern', u: 'B', v: 'A' }).lanterns).toEqual([]);
    expect(editDesign(THREE, { type: 'toggleLantern', u: 'B', v: 'C' })).toEqual({
      ok: false,
      error: 'sproutBusy',
    });
    expect(editDesign(THREE, { type: 'toggleLantern', u: 'A', v: 'C' })).toEqual({
      ok: false,
      error: 'notAVine',
    });
  });

  it('clears the whole design', () => {
    expect(edited(THREE, { type: 'clear' })).toEqual(EMPTY_DESIGN);
  });

  it('keeps bees and flowers while every vine joins the two, and forgets them otherwise', () => {
    const sides: Design = {
      sprouts: [
        { label: 'A', x: 100, y: 100, kind: 'bee' },
        { label: 'B', x: 140, y: 100, kind: 'flower' },
        { label: 'C', x: 180, y: 100, kind: 'bee' },
      ],
      vines: [],
      lanterns: [],
    };
    const joined = edited(sides, { type: 'toggleVine', u: 'A', v: 'B' });
    expect(joined.sprouts.map((sprout) => sprout.kind)).toEqual(['bee', 'flower', 'bee']);
    expect(edited(joined, { type: 'removeSprout', label: 'C' }).sprouts[0]?.kind).toBe('bee');
    // Two bees joined, or a sprout added by hand, make it a garden like any other.
    const plain = (design: Design): boolean =>
      design.sprouts.every((sprout) => !('kind' in sprout));
    expect(plain(edited(joined, { type: 'toggleVine', u: 'A', v: 'C' }))).toBe(true);
    expect(plain(edited(joined, { type: 'addSprout', x: 300, y: 200 }))).toBe(true);
  });
});

describe('the limits a design breaks', () => {
  it('names the first limit broken, or none', () => {
    expect(limitBreach(EMPTY_DESIGN)).toBeNull();
    expect(limitBreach(THREE)).toBeNull();
    const at = (label: string, x: number) => ({ label, x, y: 100 });
    const many = Array.from({ length: MAX_SPROUTS + 1 }, (_, i) => at(`S${i}`, 20 + 18 * i));
    expect(limitBreach({ sprouts: many, vines: [], lanterns: [] })).toBe('tooMany');
    expect(limitBreach({ sprouts: [at('A', 100), at('B', 110)], vines: [], lanterns: [] })).toBe(
      'tooClose',
    );
    expect(limitBreach({ sprouts: [at('A', 1)], vines: [], lanterns: [] })).toBe('outside');
    const vines = Array.from({ length: MAX_VINES + 1 }, (): [string, string] => ['A', 'B']);
    expect(limitBreach({ sprouts: [at('A', 100)], vines, lanterns: [] })).toBe('tooManyVines');
  });
});

describe('the reducer, property', () => {
  it('never leaves the limits, covers a name nor puts two lanterns on a sprout', () => {
    fc.assert(
      fc.property(fc.array(anyEdit, { maxLength: 120 }), (edits) => {
        let design = EMPTY_DESIGN;
        for (const edit of edits) {
          const outcome = editDesign(design, edit);
          if (outcome.ok) design = outcome.value;
          expect(limitBreach(design)).toBeNull();
          expect(checkLayout(design)).toEqual([]);
          const lit = design.lanterns.flat();
          expect(new Set(lit).size).toBe(lit.length);
          const vines = new Set(design.vines.map((vine) => [...vine].sort().join()));
          expect(vines.size).toBe(design.vines.length);
          for (const lantern of design.lanterns) {
            expect(vines.has([...lantern].sort().join())).toBe(true);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
