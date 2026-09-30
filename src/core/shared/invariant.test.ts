import { describe, expect, it } from 'vitest';
import { InvariantError, invariant } from './invariant';

describe('invariant', () => {
  it('does nothing when the condition holds', () => {
    expect(() => invariant(true, 'unused')).not.toThrow();
  });

  it('throws an InvariantError with the message when the condition fails', () => {
    expect(() => invariant(false, 'mate must be symmetric')).toThrow(InvariantError);
    expect(() => invariant(0, 'mate must be symmetric')).toThrow('mate must be symmetric');
  });
});
