import { describe, expect, it } from 'vitest';
import { levelSchema, type LevelData } from './schema';
import { checkSecrets } from './secretChecks';

/**
 * A one-vine level of the synthetic catalog, as a file writes it: two stars at most (completing
 * and no hints), so a chapter of `n` such levels gives at most `2n` stars.
 */
const level = (id: string, more: object = {}): LevelData =>
  levelSchema.parse({
    id,
    sprouts: [
      { label: 'A', x: 200, y: 135 },
      { label: 'B', x: 280, y: 135 },
    ],
    vines: [['A', 'B']],
    goal: { visible: true, value: 1 },
    victory: { type: 'matchingSize', value: 1 },
    solution: [{ type: 'join', u: 'A', v: 'B' }],
    ...more,
  });

/** A secret flower opened by `stars` stars of its chapter. */
const secret = (id: string, stars: number, more: object = {}): LevelData =>
  level(id, { secret: { stars }, ...more });

/** Chapter 1 of the synthetic catalog: two levels (4 stars at most), then its secret flower. */
const chapter = [level('1.1'), level('1.2')];

describe('the checks of the secret flowers', () => {
  it('a flower after its chapter, asking for more stars than its levels and at most them all, is sound', () => {
    expect(checkSecrets([...chapter, secret('1.3', 3)])).toEqual([]);
    expect(checkSecrets([...chapter, secret('1.3', 4)])).toEqual([]);
  });

  it('a catalog without flowers has nothing to check', () => {
    expect(checkSecrets(chapter)).toEqual([]);
  });

  it('a flower can never ask for more stars than its chapter gives', () => {
    expect(checkSecrets([...chapter, secret('1.3', 5)])).toEqual([
      { code: 'secretStarsOutOfRange', level: '1.3', stars: 5, least: 3, most: 4 },
    ]);
  });

  it('nor for only the stars of completing the chapter, which opening it already asks', () => {
    expect(checkSecrets([...chapter, secret('1.3', 2)])).toEqual([
      { code: 'secretStarsOutOfRange', level: '1.3', stars: 2, least: 3, most: 4 },
    ]);
  });

  it('a flower in the middle of its chapter is a problem, whatever the order of the files', () => {
    expect(checkSecrets([level('1.3'), secret('1.2', 3), level('1.1')])).toEqual([
      { code: 'secretNotLast', level: '1.2', before: '1.3' },
    ]);
  });

  it('a chapter holds one flower only', () => {
    expect(checkSecrets([...chapter, secret('1.3', 3), secret('1.4', 3)])).toEqual([
      { code: 'secretNotLast', level: '1.3', before: '1.4' },
      { code: 'secretTwice', chapter: '1', levels: ['1.3', '1.4'] },
    ]);
  });

  it('a flower unlocks nothing: no actions and no Codex page', () => {
    const actions = secret('1.3', 3, { unlocks: { actions: ['passLantern'] } });
    const codex = secret('1.3', 3, { unlocks: { codex: ['C2'] } });
    expect(checkSecrets([...chapter, actions])).toEqual([{ code: 'secretUnlocks', level: '1.3' }]);
    expect(checkSecrets([...chapter, codex])).toEqual([{ code: 'secretUnlocks', level: '1.3' }]);
  });

  it('a flower asks no notebook question and is never a draft', () => {
    const drafted = secret('1.3', 3, { draft: true });
    expect(checkSecrets([...chapter, drafted])).toEqual([{ code: 'secretDraft', level: '1.3' }]);
    const question = {
      prompt: 'ch1.3.notebook.00',
      codex: 'C2',
      options: [
        { line: 'ch1.3.notebook.01', correct: true },
        { line: 'ch1.3.notebook.02', correct: false },
      ],
    };
    const withNotebook = secret('1.3', 3, { notebook: [question] });
    expect(checkSecrets([...chapter, withNotebook])).toEqual([
      { code: 'secretNotebook', level: '1.3' },
    ]);
  });

  it('drafts of the chapter neither count for its stars nor have to come before the flower', () => {
    const draft = level('1.4', { draft: true, water: 3 });
    expect(checkSecrets([...chapter, secret('1.3', 3), draft])).toEqual([]);
  });
});
