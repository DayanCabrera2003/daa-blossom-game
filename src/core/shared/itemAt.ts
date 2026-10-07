import { InvariantError } from './invariant';

/**
 * The item at `index`, for indices the code guarantees are inside the list (a sprout id into
 * `mate`, a position into a loop). Strict index checks type `items[index]` as possibly undefined;
 * asserting it away would let a broken invariant flow on as `undefined`, while this stops right at
 * the faulty read.
 */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new InvariantError(`index ${index} is outside a list of ${items.length}`);
  }
  return items[index] as T;
}
