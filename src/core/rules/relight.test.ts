import { describe, expect, it } from 'vitest';
import { pathGraph } from '../generators/families';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import { plantForest } from '../search/forest';
import { relight } from './relight';
import { createGardenState } from './state';

const path = pathGraph(4);
const start = createGardenState({ graph: path, allowed: [] });
const lit = unwrap(createMatching(path, [[0, 1]]));

describe('relighting the garden', () => {
  it('sets the new lanterns and the open garden that shows them', () => {
    const outcome = relight(start, lit, [{ type: 'light', u: 0, v: 1 }]);
    expect(outcome).toEqual({
      ok: true,
      state: { ...start, matching: lit, layer: { ...start.layer, matching: lit } },
      events: [{ type: 'light', u: 0, v: 1 }],
    });
  });

  it('wipes a search in progress and the chain it saw: they were about the old lanterns', () => {
    const searching = {
      ...start,
      search: plantForest(start.matching, [0]),
      chainSeen: [0, 1],
    };
    const outcome = relight(searching, lit, [{ type: 'light', u: 0, v: 1 }]);
    expect(outcome.ok && outcome.state.search).toBeNull();
    expect(outcome.ok && outcome.state.chainSeen).toBeNull();
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'light', u: 0, v: 1 },
      { type: 'searchCleared' },
    ]);
  });
});
