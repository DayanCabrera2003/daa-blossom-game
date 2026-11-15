import { describe, expect, it } from 'vitest';
import { AUTOMATON, festivalLevel } from '../../tests/support/fixtureLevels';
import type { Level } from './build';
import { checkHintSuns } from './hintSuns';
import { loadLevel } from './loader';

/**
 * The broken recipe of 6.3 on the garden of 5.1, with `highlight` lit up by its grade-2 hint. Bruto's
 * run without the fold card leaves R and t as suns of their own trees; from R, a and h are moons
 * and b, g and d suns; b–d, two suns of R's tree, is where the fold card would have acted.
 */
const brokenRecipe = (highlight: readonly string[]): Level => {
  const hints = [
    { line: 'ch6.3.sauce.05' },
    { line: 'ch6.3.sauce.06', highlight },
    { line: 'ch6.3.sauce.07' },
  ];
  // The hints belong to the step that repairs the recipe: its own, never the level's.
  const flow = AUTOMATON.flow.map((step, i) => (i === 2 ? { ...step, hints } : step));
  const loaded = loadLevel({ ...AUTOMATON, flow });
  if (!loaded.ok) throw new Error(`level does not load: ${JSON.stringify(loaded.error)}`);
  return loaded.value;
};

describe('hintSuns: a hint over a broken recipe lights up suns of one tree', () => {
  it('the two ends of the vine the missing card passed over are suns of one tree', () => {
    expect(checkHintSuns(brokenRecipe(['b', 'd']))).toEqual([]);
    expect(checkHintSuns(brokenRecipe(['d']))).toEqual([]);
  });

  it('a moon lit up as a sun is reported, by name', () => {
    expect(checkHintSuns(brokenRecipe(['h', 'R']))).toEqual([
      { code: 'hintNotSun', line: 'ch6.3.sauce.06', sprouts: ['h'] },
    ]);
    expect(checkHintSuns(brokenRecipe(['a', 'h']))).toEqual([
      { code: 'hintNotSun', line: 'ch6.3.sauce.06', sprouts: ['a', 'h'] },
    ]);
  });

  it('suns of two different trees are reported: their vine would be a chain, not a flower', () => {
    expect(checkHintSuns(brokenRecipe(['t', 'b']))).toEqual([
      { code: 'hintSunsApart', line: 'ch6.3.sauce.06' },
    ]);
  });

  it('says nothing of a level with no broken recipe to repair', () => {
    expect(checkHintSuns(festivalLevel())).toEqual([]);
    expect(checkHintSuns(brokenRecipe([]))).toEqual([]);
  });
});
