/**
 * The shortcut to the secret flowers of the hub (plan 08, phase 5; plan 09, phase 4): F puts the
 * keyboard's focus on the next flower there is (Shift+F on the one before). The flowers are also in
 * the hub's focus order, and Enter or Space press the one in focus like any other thing
 * (`input/focusOrder.ts`). Flowers are counted in the order of their chapters; a pointer on a flower
 * works the same without any of this.
 */

/** Which way F goes: Shift+F goes back. */
export type FlowerKey = 'next' | 'previous';

/** The flower in focus after a key, as an index into the flowers. */
export interface FlowerFocus {
  readonly focus: number | null;
}

/** Where `key` takes the focus from flower `focus` (null for none) among `count` flowers. */
export function flowerKey(key: FlowerKey, focus: number | null, count: number): FlowerFocus {
  if (count === 0) return { focus: null };
  if (key === 'next') return { focus: focus === null ? 0 : (focus + 1) % count };
  return { focus: focus === null ? count - 1 : (focus - 1 + count) % count };
}
