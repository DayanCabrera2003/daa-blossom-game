/**
 * What the overlay layer shows, as a stack from the bottom up, decided without the DOM: only the
 * top is drawn, and closing it uncovers what lies under. Only the epilogue keeps what opens over
 * it: its "Leer el Códex" opens the Codex on top, and closing the Codex comes back to the epilogue
 * rather than to the garden. A book opened from another book (a notebook link to the Codex) takes
 * that book's place; the epilogue, when asked for, always starts afresh on its own.
 */

/** Anything the layer can show: a book, or the epilogue. */
export interface Shown {
  readonly kind: 'book' | 'epilogue';
}

/** The stack after `request` is shown over `stack`. */
export function afterShow<T extends Shown>(stack: readonly T[], request: T): readonly T[] {
  if (request.kind === 'epilogue') return [request];
  // A book stays over the epilogue, if it lies at the bottom, and replaces any book above it.
  const under = stack.filter((shown) => shown.kind === 'epilogue');
  return [...under, request];
}

/** The stack once its top closes: what lay under, if anything. */
export const afterClose = <T extends Shown>(stack: readonly T[]): readonly T[] =>
  stack.slice(0, -1);
