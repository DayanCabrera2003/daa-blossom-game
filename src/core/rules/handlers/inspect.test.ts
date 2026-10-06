import { describe, expect, it } from 'vitest';
import { pathGraph } from '../../generators/families';
import { createGardenState } from '../state';
import { inspect } from './inspect';

const path = pathGraph(4);
const fog = createGardenState({ graph: path, fog: true, allowed: ['inspect'] });

describe('inspect: lift the fog around a sprout', () => {
  it('shows the vines of the sprout for a drop of water (level 3.1)', () => {
    const outcome = inspect(fog, { type: 'inspect', vertex: 1 });
    expect(outcome.ok && outcome.state.revealed).toEqual([false, true, false, false]);
    expect(outcome.ok && outcome.state.waterUsed).toBe(1);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'inspect', vertex: 1, vines: [0, 2] }]);
  });

  it('water is counted, never a wall: inspecting with the budget spent still works', () => {
    const thirsty = { ...fog, waterUsed: 99 };
    expect(inspect(thirsty, { type: 'inspect', vertex: 0 }).ok).toBe(true);
  });

  it('a sprout already seen needs no second look', () => {
    const outcome = inspect(fog, { type: 'inspect', vertex: 1 });
    if (!outcome.ok) throw new Error('first look refused');
    expect(inspect(outcome.state, { type: 'inspect', vertex: 1 })).toEqual({
      ok: false,
      reason: { code: 'alreadyInspected', vertex: 1 },
    });
  });

  it('without fog there is nothing to inspect', () => {
    const clear = createGardenState({ graph: path, allowed: ['inspect'] });
    expect(inspect(clear, { type: 'inspect', vertex: 0 })).toEqual({
      ok: false,
      reason: { code: 'noFog' },
    });
  });
});
