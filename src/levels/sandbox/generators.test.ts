import { maximumSize } from '@core/edmonds/fast/maximum';
import { nestedFlowers } from '@core/generators/hardCases';
import { bipartition } from '@core/graph/bipartition';
import { size as lanternCount } from '@core/matching/queries';
import { unwrap } from '@core/shared/result';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { checkIntegrity } from '../integrity';
import { vineCrossings } from '../layoutChecks';
import { loadLevel } from '../loader';
import { limitBreach } from './design';
import { GENERATORS, GENERATOR_IDS, generate, generatorOf, type GeneratorId } from './generators';
import { LAYOUT_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { MAX_VINES } from './limits';
import { LETTERS } from './names';
import { toLevelFile } from './toLevel';

/** The seeds each size is grown from: the random generators grow a different garden from each. */
const SEEDS = [1, 7, 23, 99] as const;

/** Every size each generator offers, from its smallest to its largest. */
const EVERY_SIZE: readonly [GeneratorId, number][] = GENERATORS.flatMap(({ id, min, max }) =>
  Array.from({ length: max - min + 1 }, (_, i): [GeneratorId, number] => [id, min + i]),
);

describe('the generators of the free mode', () => {
  it('are the ten of the plan, in its order, each named by its text', () => {
    expect(GENERATOR_IDS).toEqual([
      'path',
      'cycle',
      'star',
      'complete',
      'random',
      'beesFlowers',
      'longStem',
      'nested',
      'helix',
      'manyFlowers',
    ]);
    expect(GENERATORS.map((generator) => generator.id)).toEqual(GENERATOR_IDS);
    for (const generator of GENERATORS) {
      expect(generator.textKey).toBe(`sandbox.gen.${generator.id}`);
      expect(generator.min).toBeLessThanOrEqual(generator.max);
    }
  });

  it('offer the sizes of the plan', () => {
    const ranges = Object.fromEntries(GENERATORS.map(({ id, min, max }) => [id, [min, max]]));
    expect(ranges).toEqual({
      path: [2, 20],
      cycle: [3, 20],
      star: [2, 12],
      complete: [2, 8],
      random: [4, 20],
      beesFlowers: [4, 20],
      longStem: [1, 6],
      nested: [1, 4],
      helix: [2, 5],
      manyFlowers: [1, 5],
    });
  });

  it('say which ones bring their lanterns, which grow bees and flowers, and which are random', () => {
    const which = (keep: (g: (typeof GENERATORS)[number]) => boolean): GeneratorId[] =>
      GENERATORS.filter(keep).map(({ id }) => id);
    expect(which((g) => g.lit)).toEqual(['longStem', 'nested', 'helix', 'manyFlowers']);
    expect(which((g) => g.beesAndFlowers)).toEqual(['beesFlowers']);
    expect(which((g) => g.random)).toEqual(['random', 'beesFlowers']);
  });

  it.each(EVERY_SIZE)(
    '%s of size %i grows a design within limits that loads and passes every check',
    (id, size) => {
      for (const seed of SEEDS) {
        const { design } = generate(id, size, seed);
        expect(limitBreach(design)).toBeNull();
        const level = loadLevel(toLevelFile(design));
        expect(level.ok).toBe(true);
        if (!level.ok) return;
        // No exemption: every name reads on its own, as in the catalog.
        expect(checkIntegrity(level.value)).toEqual([]);
      }
    },
  );

  it(
    'grows rows and rings whose vines never cross',
    () => {
      for (const [id, size] of EVERY_SIZE.filter(([id]) => id === 'path' || id === 'cycle')) {
        expect(vineCrossings(generate(id, size, 1).design)).toEqual([]);
      }
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it('names the sprouts A, B, C… in the order the core grows them', () => {
    const { design } = generate('path', 5, 1);
    expect(design.sprouts.map((sprout) => sprout.label)).toEqual(LETTERS.slice(0, 5));
    expect(design.vines).toEqual([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'E'],
    ]);
    expect(design.lanterns).toEqual([]);
  });

  it('keeps the lanterns of the gardens of flowers, and the optimum of nested flowers 4', () => {
    const { design } = generate('nested', 4, 1);
    const core = nestedFlowers(4);
    expect(design.sprouts).toHaveLength(core.graph.n);
    expect(design.lanterns).toHaveLength(lanternCount(core.matching));
    const level = unwrap(loadLevel(toLevelFile(design)));
    expect(maximumSize(level.graph)).toBe(maximumSize(core.graph));
  });

  it('grows bees and flowers that only pair with each other', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { design } = generate('beesFlowers', 12, seed);
      const kindOf = new Map(design.sprouts.map((sprout) => [sprout.label, sprout.kind]));
      expect(design.sprouts.every((sprout) => sprout.kind !== undefined)).toBe(true);
      for (const [u, v] of design.vines) expect(kindOf.get(u)).not.toBe(kindOf.get(v));
      const level = unwrap(loadLevel(toLevelFile(design)));
      expect(bipartition(level.graph).kind).toBe('bipartite');
    }
  });

  it('grows the same garden from the same seed, and another one from another seed', () => {
    for (const { id, max } of GENERATORS) {
      expect(generate(id, max, 42)).toEqual(generate(id, max, 42));
    }
    const vinesOf = (seed: number): unknown => generate('random', 10, seed).design.vines;
    expect(new Set([1, 2, 3, 4, 5].map((seed) => JSON.stringify(vinesOf(seed)))).size).toBe(5);
  });

  it('ignores the seed where nothing is random', () => {
    for (const { id, max, random } of GENERATORS) {
      if (!random) expect(generate(id, max, 1)).toEqual(generate(id, max, 2));
    }
  });

  it('shrinks a garden that would pass 40 vines until it fits, and says so', () => {
    const shrunk = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((seed) => generate('random', 20, seed))
      .filter((outcome) => outcome.size < 20);
    expect(shrunk.length).toBeGreaterThan(0);
    for (const outcome of shrunk) {
      expect(outcome.shrunk).toBe(true);
      expect(outcome.design.sprouts).toHaveLength(outcome.size);
      expect(outcome.design.vines.length).toBeLessThanOrEqual(MAX_VINES);
    }
    const small = generate('random', 4, 0);
    expect(small).toMatchObject({ size: 4, shrunk: false });
  });

  it(
    'property: any generator, size and seed grows a design within the limits',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...GENERATOR_IDS).chain((id) => {
            const { min, max } = generatorOf(id);
            return fc.tuple(fc.constant(id), fc.integer({ min, max }), fc.integer());
          }),
          ([id, size, seed]) => {
            const outcome = generate(id, size, seed);
            expect(limitBreach(outcome.design)).toBeNull();
            expect(outcome.size).toBeLessThanOrEqual(size);
            expect(outcome.shrunk).toBe(outcome.size < size);
            expect(loadLevel(toLevelFile(outcome.design)).ok).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    },
    LAYOUT_PROPERTY_TIMEOUT,
  );

  it('refuses a size its generator does not offer', () => {
    expect(() => generate('path', 21, 1)).toThrow();
    expect(() => generate('nested', 0, 1)).toThrow();
    expect(() => generate('star', 2.5, 1)).toThrow();
  });
});
