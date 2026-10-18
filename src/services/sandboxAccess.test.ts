import { describe, expect, it } from 'vitest';
import { UNLOCKED_AT } from '@core/rules/permissions';
import type { CatalogEntry } from './progress';
import { emptySave, recordCompletion, type SaveData } from './save';
import { sandboxAccess } from './sandboxAccess';

/**
 * A catalog shaped like the game's where it matters: chapter 0, chapter 1 with its secret flower
 * and a draft, then the levels that open the gardener's tools.
 */
const CATALOG: CatalogEntry[] = [
  { id: '0.1', draft: false },
  { id: '0.2', draft: false },
  { id: '1.1', draft: false },
  { id: '1.8', draft: false },
  { id: '1.9', draft: false },
  { id: '1.10', draft: false, secret: { stars: 3 } },
  { id: '1.11', draft: true },
  { id: '3.8', draft: false },
  { id: '4.5', draft: false },
  { id: '6.2', draft: false },
  { id: '7.4', draft: false },
];

/** A save with each level of `won` completed with one star. */
const saved = (...won: string[]): SaveData =>
  won.reduce((save, id) => recordCompletion(save, id, 1), emptySave());

/** Every level of the synthetic catalog up to `last`, both included, drafts and flowers aside. */
const upTo = (last: string): string[] => {
  const ids = CATALOG.filter((level) => !level.draft && level.secret === undefined).map(
    (level) => level.id,
  );
  return ids.slice(0, ids.indexOf(last) + 1);
};

describe('what the free mode offers for a progress', () => {
  it('does not exist before chapter 1 is finished', () => {
    expect(sandboxAccess(CATALOG, emptySave(), false).exists).toBe(false);
    expect(sandboxAccess(CATALOG, saved('0.1', '0.2', '1.1', '1.8'), false).exists).toBe(false);
  });

  it('exists once every level of chapter 1 is won; its flower and its drafts do not count', () => {
    expect(sandboxAccess(CATALOG, saved(...upTo('1.9')), false).exists).toBe(true);
  });

  it('always exists in teacher mode, with every action and every tool', () => {
    expect(sandboxAccess(CATALOG, emptySave(), true)).toEqual({
      exists: true,
      actions: Object.keys(UNLOCKED_AT),
      gardener: true,
      scarecrows: true,
      stones: true,
      interfaceAt: '7.4',
    });
  });

  it('shows the pieces of the interface of the most advanced level won', () => {
    expect(sandboxAccess(CATALOG, saved(...upTo('4.5')), false).interfaceAt).toBe('4.5');
    expect(sandboxAccess(CATALOG, saved(...upTo('1.9'), '1.10'), false).interfaceAt).toBe('1.10');
  });

  it('with nothing won, the interface of the first level; with no catalog, of none', () => {
    expect(sandboxAccess(CATALOG, emptySave(), false).interfaceAt).toBe('0.1');
    expect(sandboxAccess([], emptySave(), false).interfaceAt).toBe('0.0');
  });

  it('in teacher mode, the interface of the last level of all, drafts included', () => {
    expect(sandboxAccess(CATALOG, emptySave(), true).interfaceAt).toBe('7.4');
    expect(
      sandboxAccess([{ id: '8.1', draft: true }, ...CATALOG], emptySave(), true).interfaceAt,
    ).toBe('8.1');
  });

  it('plays with the actions of the most advanced level won', () => {
    const access = sandboxAccess(CATALOG, saved(...upTo('1.9')), false);
    expect(access.actions).toContain('declareDone');
    expect(access.actions).not.toContain('inspect');
  });

  it('with 4.5 the most advanced won: folding and unfolding, neither stones nor the gardener', () => {
    const access = sandboxAccess(CATALOG, saved(...upTo('4.5')), false);
    expect(access.actions).toEqual(expect.arrayContaining(['fold', 'foldAt', 'unfold']));
    expect(access.actions).not.toContain('liftStone');
    expect(access).toMatchObject({ gardener: false, scarecrows: true, stones: false });
  });

  it('brings the scarecrows at 3.8, the gardener at 6.2 and the stones at 7.4', () => {
    expect(sandboxAccess(CATALOG, saved(...upTo('1.9')), false)).toMatchObject({
      gardener: false,
      scarecrows: false,
      stones: false,
    });
    expect(sandboxAccess(CATALOG, saved(...upTo('3.8')), false).scarecrows).toBe(true);
    expect(sandboxAccess(CATALOG, saved(...upTo('6.2')), false)).toMatchObject({
      gardener: true,
      stones: false,
    });
    expect(sandboxAccess(CATALOG, saved(...upTo('7.4')), false).stones).toBe(true);
  });

  it('with nothing won (a shared link), has the actions of the first level', () => {
    expect(sandboxAccess(CATALOG, emptySave(), false).actions).toEqual(['join', 'split']);
    expect(sandboxAccess([], emptySave(), false)).toMatchObject({ exists: false, actions: [] });
  });

  it('a won secret flower counts as the level it is, never past its chapter', () => {
    const access = sandboxAccess(CATALOG, saved(...upTo('1.9'), '1.10'), false);
    expect(access.actions).not.toContain('inspect');
  });
});
