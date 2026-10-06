import { describe, expect, it } from 'vitest';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import { unwrap } from '../shared/result';
import type { TraceEvent } from '../trace/events';
import { createRecorder } from '../trace/recorder';
import { runPhase } from './phase';

/** The events after the search: unfolding and passing the lanterns. */
const ending = (events: readonly TraceEvent[]) =>
  events.filter((event) => event.type === 'expand' || event.type === 'augment');

describe('one phase of Edmonds', () => {
  it('opens F2, then F1 inside it, and passes the lanterns (level 5.1)', () => {
    // R a b c d g h t = 0 1 2 3 4 5 6 7.
    const wild = unwrap(
      createGraph(8, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
        [3, 5],
        [5, 6],
        [0, 6],
        [1, 7],
      ]),
    );
    const lanterns = unwrap(
      createMatching(wild, [
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    );
    const recorder = createRecorder();
    const outcome = runPhase(wild, lanterns, recorder);
    expect(ending(recorder.events)).toEqual([
      { type: 'expand', blossom: 1 },
      { type: 'expand', blossom: 0 },
      { type: 'augment', path: [0, 6, 5, 3, 4, 2, 1, 7] },
    ]);
    expect(outcome.kind).toBe('augmented');
    if (outcome.kind === 'augmented') expect(size(outcome.matching)).toBe(4);
  });

  it('leaves folded the flowers the chain does not cross (level 4.8)', () => {
    // A closed triangle hangs from R; the chain runs along the other branch to T.
    // R a b c d x y z w T = 0 1 2 3 4 5 6 7 8 9.
    const twoBranches = unwrap(
      createGraph(10, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [8, 9],
      ]),
    );
    const lanterns = unwrap(
      createMatching(twoBranches, [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ]),
    );
    const recorder = createRecorder();
    runPhase(twoBranches, lanterns, recorder);
    expect(recorder.events.some((event) => event.type === 'contract')).toBe(true);
    expect(ending(recorder.events)).toEqual([{ type: 'augment', path: [0, 5, 6, 7, 8, 9] }]);
  });

  it('reports the maximum, with the final garden and forest, when no chain exists (4.9)', () => {
    const closed = unwrap(
      createGraph(5, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
      ]),
    );
    const lanterns = unwrap(
      createMatching(closed, [
        [1, 2],
        [3, 4],
      ]),
    );
    const outcome = runPhase(closed, lanterns);
    expect(outcome.kind).toBe('maximum');
    if (outcome.kind === 'maximum')
      expect(outcome.forest.label).toEqual(['outer', 'inner', 'outer']);
  });
});
