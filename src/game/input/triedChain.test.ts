import { describe, expect, it } from 'vitest';
import { triedChain } from './triedChain';

describe('the chain a refused drag tried', () => {
  it('is the chain dragged so far, then the sprout it was refused at', () => {
    expect(triedChain([0, 1], { kind: 'sprout', vertex: 3 })).toEqual({
      type: 'chain',
      path: [0, 1, 3],
    });
  });

  it('adds nothing that is not a sprout, and starts empty without a chain', () => {
    expect(triedChain([0, 1], { kind: 'nothing' })).toEqual({ type: 'chain', path: [0, 1] });
    expect(triedChain(null, { kind: 'sprout', vertex: 2 })).toEqual({ type: 'chain', path: [2] });
  });
});
