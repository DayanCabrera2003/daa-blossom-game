import type { LevelData } from './schema';

/**
 * The most stars a level can give, read from what its file declares (GDD §5.4): one for completing
 * it, one for opening no hint (earned even where no hint is offered), one more within the water
 * budget where there is one, and one more for a right formal bet (an informal one, as in 0.4, earns
 * nothing). It is the count of the stars of a won level with everything in its favour, so the
 * secret flowers can ask for a share of a chapter's stars without playing it.
 */
export function starsCeiling(level: Pick<LevelData, 'water' | 'flow'>): number {
  const water = level.water === null ? 0 : 1;
  const bet = hasFormalBet(level) ? 1 : 0;
  return 2 + water + bet;
}

/** Whether the script asks a formal bet, the one that earns a star when it is right. */
export function hasFormalBet(level: Pick<LevelData, 'flow'>): boolean {
  return level.flow.some((step) => step.step === 'bet' && !step.informal);
}
