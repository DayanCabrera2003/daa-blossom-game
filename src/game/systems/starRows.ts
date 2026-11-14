import type { StarResult } from './stars';

/** Each star a level can give (GDD §5.4), named as its row of the victory panel says it. */
export type StarKind = 'done' | 'noHints' | 'water' | 'bet';

/** One row of the victory panel: which star it tells, and whether it was earned. */
export interface StarRow {
  readonly star: StarKind;
  readonly earned: boolean;
}

/**
 * The rows of the stars of a won level, one per star it can give, earned or not, so the panel says
 * what each one is for: completing it (always earned) and opening no hint in every level, then
 * staying within the water where it is counted, then a right formal bet where there is one. A
 * missed bet keeps its row, unearned, so the player sees what it cost. There are as many rows as
 * `starsCeiling` gives for the level.
 */
export function starRows(stars: StarResult): StarRow[] {
  return [
    { star: 'done', earned: true },
    { star: 'noHints', earned: stars.noHints },
    ...(stars.withinWater === null ? [] : [{ star: 'water' as const, earned: stars.withinWater }]),
    ...(stars.betRight === null ? [] : [{ star: 'bet' as const, earned: stars.betRight }]),
  ];
}
