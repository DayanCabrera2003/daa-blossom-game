import { describe, expect, it } from 'vitest';
import { pathGraph } from '../../generators/families';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import { createGardenState } from '../state';
import { passLantern } from './passLantern';

// Level 1.1 after the trap: a–b=c–d, as 0–1=2–3.
const path = pathGraph(4);
const trap = createGardenState({
  graph: path,
  matching: unwrap(createMatching(path, [[1, 2]])),
  allowed: ['passLantern'],
});

describe('pass the lantern', () => {
  it('a sprout in the dark takes the lantern of its neighbor, whose partner goes dark', () => {
    const outcome = passLantern(trap, { type: 'passLantern', from: 0, to: 1 });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([1, 0, -1, -1]);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'augment', path: [0, 1, 2] }]);
  });

  it('the one asking must be in the dark', () => {
    expect(passLantern(trap, { type: 'passLantern', from: 2, to: 1 })).toEqual({
      ok: false,
      reason: { code: 'alreadyLit', vertex: 2 },
    });
  });

  it('the neighbor must have a lantern to give', () => {
    const dark = createGardenState({ graph: path, allowed: ['passLantern'] });
    expect(passLantern(dark, { type: 'passLantern', from: 0, to: 1 })).toEqual({
      ok: false,
      reason: { code: 'noLanternToPass', vertex: 1 },
    });
  });

  it('only neighbors can pass a lantern', () => {
    expect(passLantern(trap, { type: 'passLantern', from: 0, to: 2 })).toEqual({
      ok: false,
      reason: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });
});
