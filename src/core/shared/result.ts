/**
 * Errors as values. Operations that can fail because of player input or level data return a
 * `Result` with a stable error code instead of throwing; exceptions are reserved for bugs.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/**
 * Extracts the value of a result that is known to be ok (tests, fixtures, trusted data).
 * Throwing here means the caller's assumption was wrong, which is a bug.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(`unwrap called on an error result: ${JSON.stringify(result.error)}`);
}
