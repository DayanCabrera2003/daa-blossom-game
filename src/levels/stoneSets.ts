import type { VertexId } from '@core/graph/types';

/**
 * The stones of the certificates presented to the council (7.6, plan 08 phase 1), compared as sets:
 * the order they were lifted in tells nothing. Shared by the session, which ends the step that asks
 * for another certificate only with new stones, and by the script checks, which require the
 * reference walkthrough to present new ones.
 */

/** The stones lifted, in order of their ids: one way to write each set. */
export const stoneSet = (stones: readonly VertexId[]): VertexId[] =>
  [...stones].sort((x, y) => x - y);

/** Whether these stones, as a set, are among the sets already presented. */
export function isPresented(
  presented: readonly (readonly VertexId[])[],
  stones: readonly VertexId[],
): boolean {
  const set = stoneSet(stones);
  return presented.some(
    (shown) => shown.length === set.length && shown.every((stone, i) => stone === set[i]),
  );
}
