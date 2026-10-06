import { describe, expect, it } from 'vitest';
import { pathGraph } from '../generators/families';
import { applyAction } from './applyAction';
import type { Action } from './actions';
import { sameGarden } from './sameGarden';
import { createGardenState, type GardenState } from './state';

const start = createGardenState({
  graph: pathGraph(4),
  fog: true,
  allowed: ['join', 'split', 'inspect', 'declareDone'],
});

/** The garden after an accepted move. */
const after = (state: GardenState, action: Action): GardenState => {
  const outcome = applyAction(state, action);
  if (!outcome.ok) throw new Error(`refused: ${outcome.reason}`);
  return outcome.state;
};

describe('sameGarden', () => {
  it('a garden is the same as itself, and as a copy of itself', () => {
    expect(sameGarden(start, start)).toBe(true);
    expect(sameGarden(start, { ...start, stones: [...start.stones] })).toBe(true);
  });

  it('a lantern lit makes another garden', () => {
    expect(sameGarden(start, after(start, { type: 'join', u: 0, v: 1 }))).toBe(false);
  });

  it('lifting fog makes another garden', () => {
    expect(sameGarden(start, after(start, { type: 'inspect', vertex: 0 }))).toBe(false);
  });

  it('a claim of "Terminé" makes another garden', () => {
    expect(sameGarden(start, after(start, { type: 'declareDone' }))).toBe(false);
  });

  it('water spent alone does not: undoing gives the fog back, not the water', () => {
    expect(sameGarden(start, { ...start, waterUsed: 3 })).toBe(true);
  });

  it('two plays reaching the same lanterns by different moves meet', () => {
    const direct = after(start, { type: 'join', u: 2, v: 3 });
    const roundabout = after(
      after(after(start, { type: 'join', u: 1, v: 2 }), { type: 'split', u: 1, v: 2 }),
      { type: 'join', u: 2, v: 3 },
    );
    expect(sameGarden(direct, roundabout)).toBe(true);
  });
});
