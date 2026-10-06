import { describe, expect, it } from 'vitest';
import { pathGraph } from '../../generators/families';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import { createGardenState } from '../state';
import { join } from './join';

// Level 1.1: the path a–b–c–d as 0–1–2–3.
const path = pathGraph(4);
const dark = createGardenState({ graph: path, allowed: ['join'] });

describe('join: light a lantern', () => {
  it('lights a lantern between two neighbors in the dark', () => {
    const outcome = join(dark, { type: 'join', u: 1, v: 2 });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([-1, 2, 1, -1]);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'light', u: 1, v: 2 }]);
  });

  it('never touches the garden it was given', () => {
    join(dark, { type: 'join', u: 1, v: 2 });
    expect(dark.matching.mate).toEqual([-1, -1, -1, -1]);
  });

  it('only neighbors can share a lantern', () => {
    expect(join(dark, { type: 'join', u: 0, v: 2 })).toEqual({
      ok: false,
      reason: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });

  it('a sprout holds one lantern at most (exclusivity, level 0.2)', () => {
    const lit = { ...dark, matching: unwrap(createMatching(path, [[1, 2]])) };
    expect(join(lit, { type: 'join', u: 2, v: 3 })).toEqual({
      ok: false,
      reason: { code: 'alreadyLit', vertex: 2 },
    });
  });

  it('rejects sprouts outside the garden', () => {
    expect(join(dark, { type: 'join', u: 0, v: 9 })).toMatchObject({
      ok: false,
      reason: { code: 'vertexOutOfRange', vertex: 9 },
    });
  });
});
