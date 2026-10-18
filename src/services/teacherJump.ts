/** The levels on either side of one, in the order of the catalog; null past either end. */
export interface NeighbourLevels {
  readonly previous: string | null;
  readonly next: string | null;
}

/**
 * Where PageUp and PageDown lead in teacher mode (GDD §5.8): the level before and the one after
 * `current` among `levelIds`, the whole catalog in order, drafts included (teacher mode shows them
 * all). A level not in the catalog has neither.
 */
export function neighbourLevels(levelIds: readonly string[], current: string): NeighbourLevels {
  const at = levelIds.indexOf(current);
  if (at < 0) return { previous: null, next: null };
  return { previous: levelIds[at - 1] ?? null, next: levelIds[at + 1] ?? null };
}
