import { describe, expect, it } from 'vitest';
import { levelSchema } from './schema';

/** Level 0.1, "Dos brotes", as a level file. */
const twoSprouts = {
  id: '0.1',
  sprouts: [
    { label: 'A', x: 200, y: 135 },
    { label: 'B', x: 280, y: 135 },
  ],
  vines: [['A', 'B']],
  goal: { visible: true, value: 1 },
  victory: { type: 'matchingSize', value: 1 },
  hints: [{ line: 'ch0.1.sauce.01', highlight: ['A', 'B'] }],
  script: ['ch0.1.sauce.00'],
  unlocks: { actions: ['join', 'split'] },
  solution: [{ type: 'join', u: 'A', v: 'B' }],
};

describe('level schema', () => {
  it('accepts a level and fills in the defaults', () => {
    const parsed = levelSchema.parse(twoSprouts);
    expect(parsed).toMatchObject({
      lanterns: [],
      fog: false,
      water: null,
      forbid: [],
      unlocks: { actions: ['join', 'split'], codex: [] },
    });
    expect(parsed.notebook).toBeUndefined();
  });

  it('reads solutions written with sprout names', () => {
    const parsed = levelSchema.parse({
      ...twoSprouts,
      solution: [
        { type: 'chain', path: ['A', 'B'] },
        { type: 'unfold', blossom: 0 },
        { type: 'declareDone' },
      ],
    });
    expect(parsed.solution).toHaveLength(3);
  });

  it('rejects level ids that are not chapter.level', () => {
    expect(levelSchema.safeParse({ ...twoSprouts, id: '0-1' }).success).toBe(false);
  });

  it('keeps sprouts inside the garden area, clear of the HUD bars (x 8–472, y 28–226)', () => {
    const at = (x: number, y: number) => ({
      ...twoSprouts,
      sprouts: [{ label: 'A', x, y }, twoSprouts.sprouts[1]],
    });
    expect(levelSchema.safeParse(at(500, 100)).success).toBe(false);
    expect(levelSchema.safeParse(at(100, 20)).success).toBe(false);
    expect(levelSchema.safeParse(at(100, 235)).success).toBe(false);
    expect(levelSchema.safeParse(at(4, 100)).success).toBe(false);
    expect(levelSchema.safeParse(at(8, 28)).success).toBe(true);
    expect(levelSchema.safeParse(at(472, 226)).success).toBe(true);
  });

  it('only knows the actions of the game', () => {
    const unknown = { ...twoSprouts, solution: [{ type: 'teleport', vertex: 'A' }] };
    expect(levelSchema.safeParse(unknown).success).toBe(false);
    expect(levelSchema.safeParse({ ...twoSprouts, forbid: ['fly'] }).success).toBe(false);
  });

  it('dialogue lines follow the id format of the voice files', () => {
    const badLine = { ...twoSprouts, script: ['sauce says hi'] };
    expect(levelSchema.safeParse(badLine).success).toBe(false);
  });

  it('a notebook question needs at least one right answer', () => {
    const notebook = {
      prompt: 'ch0.1.notebook.00',
      options: [
        { line: 'ch0.1.notebook.01', correct: false },
        { line: 'ch0.1.notebook.02', correct: false },
      ],
    };
    expect(levelSchema.safeParse({ ...twoSprouts, notebook }).success).toBe(false);
  });

  it('rejects unknown fields, so typos never pass silently', () => {
    expect(levelSchema.safeParse({ ...twoSprouts, goall: 3 }).success).toBe(false);
  });

  it('a level needs a reference solution', () => {
    expect(levelSchema.safeParse({ ...twoSprouts, solution: [] }).success).toBe(false);
  });
});
