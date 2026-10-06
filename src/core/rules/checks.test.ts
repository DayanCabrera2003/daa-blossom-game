import { describe, expect, it } from 'vitest';
import { contract } from '../blossom/contract';
import { cycleGraph } from '../generators/families';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { requireOpenGarden, requireSprouts } from './checks';
import { createGardenState } from './state';

const triangle = cycleGraph(3);
const lantern = unwrap(createMatching(triangle, [[1, 2]]));
const state = createGardenState({ graph: triangle, matching: lantern, allowed: [] });

describe('common checks of the rules', () => {
  it('accepts sprouts of the garden and points at the first unknown one', () => {
    expect(requireSprouts(state, [0, 2])).toBeNull();
    expect(requireSprouts(state, [0, 3, -1])).toEqual({ code: 'vertexOutOfRange', vertex: 3 });
    expect(requireSprouts(state, [1.5])).toEqual({ code: 'vertexOutOfRange', vertex: 1.5 });
  });

  it('lantern moves need every flower opened first (level 4.5)', () => {
    expect(requireOpenGarden(state)).toBeNull();
    const folded = { ...state, layer: contract(state.layer, [0, 1, 2]).layer };
    expect(requireOpenGarden(folded)).toEqual({ code: 'flowersFolded' });
  });
});
