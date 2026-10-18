import type { SaveData } from './save';

/**
 * The seeds of a player (GDD §5.1: a bet won gives seeds): one for each bet won, the formal one of
 * 1.6 and the doubling bets of 6.5, each the first time only. The save keeps the bets won, since
 * the stars cannot tell them; each seed plants a little plant in the hub.
 */
export function seeds(save: SaveData): number {
  return save.betsWon.length;
}
