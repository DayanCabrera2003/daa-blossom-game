import { size } from '@core/matching/queries';
import { describe, expect, it } from 'vitest';
import { automatonLevel, festivalLevel, lightLevel } from '../../tests/support/fixtureLevels';
import { gardenAtPlay } from './playStart';

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
});
