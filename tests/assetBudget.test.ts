import { describe, expect, it } from 'vitest';
import manifestJson from '../src/game/assets/manifest.json';
import { parseManifest } from '../src/game/assets/manifestSchema';
import { BUDGET, manifestSizes } from '../tools/assets/budget';

// The committed assets keep within the budget of plan 06, phase 11. The JavaScript is only known
// after a build, so `npm run budget` weighs it; here the boot group keeps room for all of it.

const SIZES = manifestSizes(parseManifest(manifestJson));

describe('the asset budget', () => {
  it.each([
    ['images', SIZES.images, BUDGET.images],
    ['fonts', SIZES.fonts, BUDGET.fonts],
    ['effects, syllables and jingles', SIZES.sounds, BUDGET.sounds],
    ['music', SIZES.music, BUDGET.music],
  ] as const)('keeps the %s within budget', (_part, bytes, limit) => {
    expect(bytes).toBeLessThanOrEqual(limit);
  });

  it('keeps the boot group light enough to load with the whole JavaScript budget', () => {
    expect(SIZES.boot).toBeLessThanOrEqual(BUDGET.initial - BUDGET.js);
  });
});
