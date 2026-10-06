import { describe, expect, it } from 'vitest';
import { loadLevel } from './loader';

const twoSprouts = {
  id: '0.1',
  sprouts: [
    { label: 'A', x: 200, y: 135 },
    { label: 'B', x: 280, y: 135 },
  ],
  vines: [['A', 'B']],
  goal: { visible: true, value: 1 },
  victory: { type: 'matchingSize', value: 1 },
  solution: [{ type: 'join', u: 'A', v: 'B' }],
};

describe('loading a level', () => {
  it('validates and builds a level in one go', () => {
    const result = loadLevel(twoSprouts);
    expect(result.ok && result.value.graph.edges).toEqual([[0, 1]]);
  });

  it('explains schema problems with the path to each one', () => {
    const result = loadLevel({ ...twoSprouts, id: 'one', sprouts: [{ label: 'A', x: -4, y: 0 }] });
    expect(result.ok).toBe(false);
    if (result.ok || result.error.code !== 'schema') throw new Error('expected a schema error');
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^id: /),
        expect.stringMatching(/^sprouts\.0\.x: /),
      ]),
    );
  });

  it('passes on problems found while building the garden', () => {
    expect(loadLevel({ ...twoSprouts, vines: [['A', 'C']] })).toMatchObject({
      ok: false,
      error: { code: 'badLabel' },
    });
  });

  it('rejects what is not a level at all', () => {
    expect(loadLevel('hello')).toMatchObject({ ok: false, error: { code: 'schema' } });
  });
});
