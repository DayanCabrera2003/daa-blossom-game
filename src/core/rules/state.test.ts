import { describe, expect, it } from 'vitest';
import { openLayer } from '../blossom/contract';
import { pathGraph } from '../generators/families';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { createGardenState } from './state';

const path = pathGraph(4);

describe('a garden at the start of a level', () => {
  it('starts open, unmarked, with no water spent and nothing placed', () => {
    const state = createGardenState({ graph: path, allowed: ['join', 'split'] });
    expect(state).toEqual({
      graph: path,
      matching: { mate: [-1, -1, -1, -1] },
      layer: openLayer(path, { mate: [-1, -1, -1, -1] }),
      search: null,
      revealed: null,
      waterUsed: 0,
      scarecrows: [],
      stones: [],
      chainSeen: null,
      declaredDone: false,
      allowed: new Set(['join', 'split']),
      roots: null,
      chains: { rule: 'any' },
      closed: new Set(),
    });
  });

  it('keeps the lanterns the level starts with', () => {
    const lanterns = unwrap(createMatching(path, [[1, 2]]));
    const state = createGardenState({ graph: path, matching: lanterns, allowed: [] });
    expect(state.matching).toBe(lanterns);
    expect(state.layer.matching).toBe(lanterns);
  });

  it('keeps the only sprouts a search may start from, when the level names them (4.1)', () => {
    const state = createGardenState({ graph: path, roots: [0], allowed: ['markRoot'] });
    expect(state.roots).toEqual([0]);
  });

  it('keeps the chain rule and the actions the level closes for the day (4.5, 4.10)', () => {
    const state = createGardenState({
      graph: path,
      chains: { rule: 'seen' },
      closed: ['split'],
      allowed: ['join'],
    });
    expect(state.chains).toEqual({ rule: 'seen' });
    expect(state.closed).toEqual(new Set(['split']));
  });

  it('in the fog nothing is revealed yet (chapter 3)', () => {
    const state = createGardenState({ graph: path, fog: true, allowed: ['inspect'] });
    expect(state.revealed).toEqual([false, false, false, false]);
  });
});
