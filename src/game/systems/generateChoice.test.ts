import { generate, generatorOf, GENERATORS } from '@levels/sandbox/generators';
import { describe, expect, it } from 'vitest';
import {
  anotherSeed,
  canGrow,
  canReseed,
  canShrink,
  defaultSize,
  FIRST_CHOICE,
  grow,
  pickGenerator,
  resizeChoice,
} from './generateChoice';

describe('the choice made in the generate menu', () => {
  it('starts with no generator picked: nothing to grow, resize nor reseed', () => {
    expect(FIRST_CHOICE.id).toBeNull();
    expect(grow(FIRST_CHOICE)).toBeNull();
    expect([canShrink(FIRST_CHOICE), canGrow(FIRST_CHOICE), canReseed(FIRST_CHOICE)]).toEqual([
      false,
      false,
      false,
    ]);
    expect(resizeChoice(FIRST_CHOICE, 1)).toBe(FIRST_CHOICE);
    expect(anotherSeed(FIRST_CHOICE)).toBe(FIRST_CHOICE);
  });

  it('a generator starts at a third of its way from its smallest size, inside its range', () => {
    for (const generator of GENERATORS) {
      const size = defaultSize(generator.id);
      expect(size).toBeGreaterThanOrEqual(generator.min);
      expect(size).toBeLessThanOrEqual(generator.max);
    }
    expect(defaultSize('path')).toBe(8);
    expect(pickGenerator(FIRST_CHOICE, 'nested')).toMatchObject({ id: 'nested', size: 2 });
  });

  it('picking the generator already picked keeps its size; another starts at its own', () => {
    const path = resizeChoice(pickGenerator(FIRST_CHOICE, 'path'), 1);
    expect(pickGenerator(path, 'path')).toBe(path);
    expect(pickGenerator(path, 'cycle').size).toBe(defaultSize('cycle'));
  });

  it('− and + stay within the range of the generator', () => {
    let star = pickGenerator(FIRST_CHOICE, 'star');
    while (canGrow(star)) star = resizeChoice(star, 1);
    expect(star.size).toBe(generatorOf('star').max);
    expect(resizeChoice(star, 1)).toBe(star);
    while (canShrink(star)) star = resizeChoice(star, -1);
    expect(star.size).toBe(generatorOf('star').min);
  });

  it('only the random ones grow another at random, from the next seed', () => {
    const random = pickGenerator(FIRST_CHOICE, 'random');
    expect(canReseed(random)).toBe(true);
    expect(anotherSeed(random).seed).toBe(random.seed + 1);
    const path = pickGenerator(FIRST_CHOICE, 'path');
    expect(canReseed(path)).toBe(false);
    expect(anotherSeed(path)).toBe(path);
  });

  it("grows the core's garden for the choice, the same each time", () => {
    const choice = anotherSeed(pickGenerator(FIRST_CHOICE, 'beesFlowers'));
    expect(grow(choice)).toEqual(generate('beesFlowers', choice.size, choice.seed));
  });
});
