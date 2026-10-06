import { describe, expect, it } from 'vitest';
import { pathGraph } from '../../generators/families';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import { createGardenState } from '../state';
import { split } from './split';

const path = pathGraph(4);
const lit = createGardenState({
  graph: path,
  matching: unwrap(createMatching(path, [[1, 2]])),
  allowed: ['split'],
});

describe('split: put a lantern out', () => {
  it('puts out the lantern two sprouts share', () => {
    const outcome = split(lit, { type: 'split', u: 2, v: 1 });
    expect(outcome.ok && outcome.state.matching.mate).toEqual([-1, -1, -1, -1]);
    expect(outcome.ok && outcome.events).toEqual([{ type: 'putOut', u: 2, v: 1 }]);
  });

  it('there must be a lantern between them', () => {
    expect(split(lit, { type: 'split', u: 2, v: 3 })).toEqual({
      ok: false,
      reason: { code: 'notLit', u: 2, v: 3 },
    });
  });

  it('rejects sprouts outside the garden', () => {
    expect(split(lit, { type: 'split', u: -1, v: 0 })).toMatchObject({
      ok: false,
      reason: { code: 'vertexOutOfRange' },
    });
  });
});
