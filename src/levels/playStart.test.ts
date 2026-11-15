import { size } from '@core/matching/queries';
import { describe, expect, it } from 'vitest';
import { automatonLevel, festivalLevel, lightLevel } from '../../tests/support/fixtureLevels';
import { gardenAtPlay, gardenBefore } from './playStart';

describe('the garden the play step starts from', () => {
  it('is the start of the level when nothing moves the garden before the play', () => {
    const level = festivalLevel();
    expect(gardenAtPlay(level)).toBe(level.start);
  });

  it("holds the marks of the light's own search made before it (4.2)", () => {
    const searched = gardenAtPlay(lightLevel());
    // R, a and b marked; d–b, the conflict, is where the light stopped.
    expect(searched.search?.label.slice(0, 3)).toEqual(['outer', 'inner', 'outer']);
  });

  it("is the end of the automaton's run, a new day from the starting lanterns (6.3)", () => {
    const level = automatonLevel();
    const ran = gardenAtPlay(level);
    // The repaired recipe runs last, reaches the 4 lanterns and says "Terminé".
    expect(size(ran.matching)).toBe(4);
    expect(ran.declaredDone).toBe(true);
  });

  it('stops at a move the rules of the level refuse, which the script checks report', () => {
    const level = automatonLevel();
    const locked = { ...level, start: { ...level.start, allowed: new Set<never>() } };
    expect(gardenAtPlay(locked)).toBe(locked.start);
  });

  it("before a later step, holds what the steps before it did: Bruto's broken run (6.3)", () => {
    const level = automatonLevel();
    // Step 2 is the recipe to repair: the run without the fold card stopped at 3 lanterns.
    const broken = gardenBefore(level, 2);
    expect(size(broken.matching)).toBe(3);
    expect(broken.declaredDone).toBe(true);
    expect(gardenBefore(level, 0)).toBe(level.start);
    expect(gardenBefore(level, level.flow.length)).toEqual(gardenAtPlay(level));
  });
});
