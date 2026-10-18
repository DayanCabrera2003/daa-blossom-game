/**
 * The keyboard on the secret flowers of the hub (plan 08, phase 5): F puts the focus on the next
 * flower there is (Shift+F on the one before), Enter or Space presses the flower in focus, and
 * Escape takes the focus away. Flowers are counted in the order of their chapters; a pointer on a
 * flower works the same without any of this.
 */

/** What a key asks of the flowers. */
export type FlowerKey = 'next' | 'previous' | 'press' | 'leave';

/** The flower in focus after a key, and the flower it presses, as indices into the flowers. */
export interface FlowerFocus {
  readonly focus: number | null;
  readonly press: number | null;
}

/** What `key` does with the focus on flower `focus` (null for none) among `count` flowers. */
export function flowerKey(key: FlowerKey, focus: number | null, count: number): FlowerFocus {
  if (count === 0) return { focus: null, press: null };
  switch (key) {
    case 'next':
      return { focus: focus === null ? 0 : (focus + 1) % count, press: null };
    case 'previous':
      return { focus: focus === null ? count - 1 : (focus - 1 + count) % count, press: null };
    case 'press':
      return { focus, press: focus };
    case 'leave':
      return { focus: null, press: null };
  }
}
