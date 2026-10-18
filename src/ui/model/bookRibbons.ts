import type { BookName } from '@services/busEvents';

/**
 * The two ribbons every book has (plan 07, phase 6), one per book, in the head over its index: the
 * Codex and the Cuaderno, the open one marked. Following the other one opens that book instead.
 * The Codex's cannot be followed while none of its pages is open; the Cuaderno's always can, since
 * an empty notebook says how it fills.
 */

/** A ribbon: the book it opens, whether that book is the one open, and whether it can be followed. */
export interface BookRibbon {
  readonly book: BookName;
  readonly current: boolean;
  readonly enabled: boolean;
}

/** The ribbons of the book `current`, given whether the Codex has some page open. */
export function bookRibbons(current: BookName, codexOpen: boolean): BookRibbon[] {
  return [
    { book: 'codex', current: current === 'codex', enabled: codexOpen },
    { book: 'notebook', current: current === 'notebook', enabled: true },
  ];
}
