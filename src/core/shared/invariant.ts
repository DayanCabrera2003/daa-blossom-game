/** Raised when an internal invariant is broken. It always signals a bug, never bad input. */
export class InvariantError extends Error {
  override readonly name = 'InvariantError';
}

/**
 * Asserts a condition that must hold if the code is correct. Unlike `Result`, this is not for
 * validating player input or level data: those are expected failures and return errors as values.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new InvariantError(message);
}
