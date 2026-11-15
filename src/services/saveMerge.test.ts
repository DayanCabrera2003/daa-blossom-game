import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CODEX_ENTRIES } from '@levels/codex';
import { memoryStore } from '../../tests/support/memoryStore';
import { CODEX_PAGES } from './codexPage';
import { emptySave, loadSave, recordCompletion, writeSave, type SaveData } from './save';
import { mergeSaves } from './saveMerge';

/** The lists of a save, each an ordered set of what the player has done once. */
const LISTS = [
  'notebook',
  'tutorialsSeen',
  'codexRead',
  'glossaryRead',
  'betsWon',
  'cosmeticsSeen',
] as const;

/** A few ids of each kind, so that two saves often share some and not others. */
const LEVELS = ['0.1', '1.1', '1.5', '2.4', '4.11'];
const list = <T>(items: readonly T[]): fc.Arbitrary<T[]> =>
  fc.uniqueArray(fc.constantFrom(...items), { maxLength: items.length });

/** Any save a player could have: every field valid, as the schema reads it back. */
const anySave: fc.Arbitrary<SaveData> = fc.record({
  version: fc.constant(5 as const),
  levels: fc.dictionary(
    fc.constantFrom(...LEVELS),
    fc.record({ stars: fc.integer({ min: 0, max: 3 }) }),
  ),
  notebook: list(LEVELS),
  tutorialsSeen: list(['fog', 'marks', 'water', 'question']),
  codexRead: list(CODEX_PAGES.slice(0, 6)),
  glossaryRead: list(CODEX_ENTRIES.slice(0, 4)),
  betsWon: list(['1.6#3', '2.4#1', '4.11#5']),
  cosmeticsSeen: list(['frog', 'lanterns', 'bees']),
});

/** The save with its lists sorted: what two merges must agree on when order may differ. */
const asSets = (save: SaveData): unknown => ({
  levels: save.levels,
  ...Object.fromEntries(LISTS.map((key) => [key, [...save[key]].sort()])),
});

describe('merging two copies of the progress', () => {
  it('a level won in either copy stays won, with the best stars of the two', () => {
    const left = recordCompletion(recordCompletion(emptySave(), '0.1', 1), '1.1', 3);
    const right = recordCompletion(recordCompletion(emptySave(), '0.1', 2), '1.5', 0);
    expect(mergeSaves(left, right).levels).toEqual({
      '0.1': { stars: 2 },
      '1.1': { stars: 3 },
      '1.5': { stars: 0 },
    });
  });

  it('keeps the order of the first copy, and adds what only the second has after it', () => {
    const left = { ...emptySave(), notebook: ['1.5', '0.1'] };
    const right = { ...emptySave(), notebook: ['2.4', '0.1', '4.11'] };
    expect(mergeSaves(left, right).notebook).toEqual(['1.5', '0.1', '2.4', '4.11']);
  });

  it('gives back the first copy itself when the second adds nothing to it', () => {
    const left = recordCompletion(emptySave(), '0.1', 2);
    const right = recordCompletion(emptySave(), '0.1', 1);
    expect(mergeSaves(left, right)).toBe(left);
    expect(mergeSaves(left, emptySave())).toBe(left);
  });

  it('never loses anything either copy holds', () => {
    fc.assert(
      fc.property(anySave, anySave, (left, right) => {
        const merged = mergeSaves(left, right);
        for (const side of [left, right]) {
          for (const [id, { stars }] of Object.entries(side.levels)) {
            expect(merged.levels[id]?.stars).toBeGreaterThanOrEqual(stars);
          }
          for (const key of LISTS) {
            expect(merged[key]).toEqual(expect.arrayContaining([...side[key]]));
          }
        }
      }),
    );
  });

  it('invents nothing: every level and every item comes from one of the copies', () => {
    fc.assert(
      fc.property(anySave, anySave, (left, right) => {
        const merged = mergeSaves(left, right);
        for (const [id, { stars }] of Object.entries(merged.levels)) {
          expect(stars).toBe(Math.max(left.levels[id]?.stars ?? -1, right.levels[id]?.stars ?? -1));
        }
        for (const key of LISTS) {
          const known = new Set<string>([...left[key], ...right[key]]);
          expect(merged[key].every((item) => known.has(item))).toBe(true);
          expect(new Set(merged[key]).size).toBe(merged[key].length);
        }
      }),
    );
  });

  it('is idempotent: merging a copy with itself, or again with either side, changes nothing', () => {
    fc.assert(
      fc.property(anySave, anySave, (left, right) => {
        expect(mergeSaves(left, left)).toBe(left);
        const merged = mergeSaves(left, right);
        expect(mergeSaves(merged, left)).toBe(merged);
        expect(mergeSaves(merged, right)).toBe(merged);
      }),
    );
  });

  it('is commutative and associative, but for the order of the lists', () => {
    fc.assert(
      fc.property(anySave, anySave, anySave, (a, b, c) => {
        expect(asSets(mergeSaves(a, b))).toEqual(asSets(mergeSaves(b, a)));
        expect(asSets(mergeSaves(mergeSaves(a, b), c))).toEqual(
          asSets(mergeSaves(a, mergeSaves(b, c))),
        );
      }),
    );
  });

  it('what it gives reads back from storage as it is', () => {
    fc.assert(
      fc.property(anySave, anySave, (left, right) => {
        const store = memoryStore();
        const merged = mergeSaves(left, right);
        writeSave(store, merged);
        expect(loadSave(store)).toEqual(merged);
      }),
    );
  });
});
