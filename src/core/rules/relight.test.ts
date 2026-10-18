import { describe, expect, it } from 'vitest';
import { contract } from '../blossom/contract';
import { createGraph } from '../graph/createGraph';
import { pathGraph } from '../generators/families';
import { itemAt } from '../shared/itemAt';
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

  it('opens every folded flower with an expand, outermost first, as a chain beside them does', () => {
    // A triangle 0 1 2 folded into a flower, which folds with 3 and 4 into a flower around it.
    const graph = unwrap(
      createGraph(5, [
        [0, 1],
        [1, 2],
        [0, 2],
        [0, 3],
        [3, 4],
        [4, 1],
      ]),
    );
    const matching = unwrap(
      createMatching(graph, [
        [1, 2],
        [3, 4],
      ]),
    );
    const open = createGardenState({ graph, matching, allowed: [] });
    const inner = contract(open.layer, [0, 1, 2]);
    const { nodeOf } = inner.layer;
    const outer = contract(inner.layer, [inner.blossom, itemAt(nodeOf, 3), itemAt(nodeOf, 4)]);
    const folded = { ...open, layer: outer.layer };
    const outcome = relight(folded, matching, [{ type: 'light', u: 0, v: 3 }]);
    expect(outcome.ok && outcome.state.layer).toEqual(open.layer);
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'light', u: 0, v: 3 },
      { type: 'expand', blossom: 1 },
      { type: 'expand', blossom: 0 },
    ]);
  });
});
