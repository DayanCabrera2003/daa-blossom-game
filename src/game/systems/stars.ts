/** What a won level was played with. */
export interface PlayRecord {
  readonly hintsOpened: number;
  /** Water spent in the whole session: undoing gives lanterns and fog back, not water. */
  readonly waterSpent: number;
  /** The level's water budget, or null when it does not count water. */
  readonly waterBudget: number | null;
  /** Whether the formal bet of the level was right; null without one, or with an informal one. */
  readonly betRight: boolean | null;
}

/** The stars of a won level, and which of the optional ones were earned. */
export interface StarResult {
  readonly total: number;
  readonly noHints: boolean;
  /** Null when the level has no water budget. */
  readonly withinWater: boolean | null;
}

/**
 * Stars (GDD §5.4): one for completing, never lost (hints "do not take stars away", §5.3, means
 * this one); one more without opening any hint (an offered hint left closed does not count); one
 * more within the water budget, where there is one; one more for a right formal bet. Stars never
 * block progress.
 */
export function computeStars(record: PlayRecord): StarResult {
  const noHints = record.hintsOpened === 0;
  const withinWater = record.waterBudget === null ? null : record.waterSpent <= record.waterBudget;
  return {
    total:
      1 + (noHints ? 1 : 0) + (withinWater === true ? 1 : 0) + (record.betRight === true ? 1 : 0),
    noHints,
    withinWater,
  };
}
