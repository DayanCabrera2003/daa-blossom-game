import { err, ok } from '@core/shared/result';
import { EMPTY_DESIGN, editDesign, type Design, type DesignEdit } from '@levels/sandbox/design';
import { describe, expect, it } from 'vitest';
import { designSound } from './designSounds';

/** A and B joined; B and C not. */
const GARDEN: Design = {
  sprouts: [
    { label: 'A', x: 100, y: 100 },
    { label: 'B', x: 150, y: 100 },
    { label: 'C', x: 200, y: 100 },
  ],
  vines: [['A', 'B']],
  lanterns: [],
};

/** The sound of `edit` on GARDEN, as the reducer answers it. */
const soundOf = (edit: DesignEdit, design: Design = GARDEN) =>
  designSound(edit, design, editDesign(design, edit));

describe('the sounds of the editor', () => {
  it('a refused edit sounds the gentle refusal of the levels', () => {
    expect(designSound({ type: 'clear' }, GARDEN, err('tooClose'))).toBe('sfx.reject');
  });

  it('planting, and growing a vine, drop water; cutting and taking away put out', () => {
    expect(soundOf({ type: 'addSprout', x: 300, y: 100 })).toBe('sfx.waterDrop');
    expect(soundOf({ type: 'toggleVine', u: 'B', v: 'C' })).toBe('sfx.waterDrop');
    expect(soundOf({ type: 'toggleVine', u: 'A', v: 'B' })).toBe('sfx.putOut');
    expect(soundOf({ type: 'removeSprout', label: 'C' })).toBe('sfx.putOut');
  });

  it('a lantern lit sparkles; put out, it puts out', () => {
    expect(soundOf({ type: 'toggleLantern', u: 'A', v: 'B' })).toBe('sfx.sparkle');
    const lit: Design = { ...GARDEN, lanterns: [['A', 'B']] };
    expect(soundOf({ type: 'toggleLantern', u: 'A', v: 'B' }, lit)).toBe('sfx.putOut');
  });

  it('clearing sweeps the garden; a move is quiet', () => {
    expect(soundOf({ type: 'clear' })).toBe('sfx.searchCleared');
    expect(soundOf({ type: 'moveSprout', label: 'C', x: 300, y: 150 })).toBeNull();
    expect(designSound({ type: 'clear' }, EMPTY_DESIGN, ok(EMPTY_DESIGN))).toBe(
      'sfx.searchCleared',
    );
  });
});
