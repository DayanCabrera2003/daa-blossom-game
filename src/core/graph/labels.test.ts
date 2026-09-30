import { describe, expect, it } from 'vitest';
import { InvariantError } from '../shared/invariant';
import { unwrap } from '../shared/result';
import { createLabels, idOf, nameOf, toEdges } from './labels';

const labels = unwrap(createLabels(['R', 'a', 'b', 'c']));

describe('sprout labels', () => {
  it('maps names to dense ids in the given order and back', () => {
    expect(idOf(labels, 'R')).toBe(0);
    expect(idOf(labels, 'c')).toBe(3);
    expect(nameOf(labels, 2)).toBe('b');
  });

  it('returns undefined for an unknown name', () => {
    expect(idOf(labels, 'z')).toBeUndefined();
  });

  it('rejects an id without a label', () => {
    expect(() => nameOf(labels, 4)).toThrow(InvariantError);
  });

  it('rejects empty names', () => {
    expect(createLabels(['R', ''])).toEqual({ ok: false, error: { code: 'emptyName', index: 1 } });
  });

  it('rejects duplicate names', () => {
    expect(createLabels(['a', 'b', 'a'])).toEqual({
      ok: false,
      error: { code: 'duplicateName', name: 'a' },
    });
  });

  it('translates named vines into edges', () => {
    expect(
      toEdges(labels, [
        ['R', 'a'],
        ['c', 'b'],
      ]),
    ).toEqual({
      ok: true,
      value: [
        [0, 1],
        [3, 2],
      ],
    });
  });

  it('reports the first unknown name in a vine', () => {
    expect(toEdges(labels, [['R', 'x']])).toEqual({
      ok: false,
      error: { code: 'unknownName', name: 'x' },
    });
  });
});
