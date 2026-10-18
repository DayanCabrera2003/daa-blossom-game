import { EPILOGUE_LEVEL } from './epilogue';

/**
 * Where a victory leads (plan 07, phase 11): the victory panel offers the next garden the player
 * can see, if there is one, and a way back. The way back is the hub, except after the last garden
 * of the game, whose way back is the epilogue "Más allá del jardín", shown over the hub. Pure: the
 * level scene asks here and builds the panel's buttons.
 */

/** The ways the victory panel offers: the next level's id (or none), and where going back leads. */
export interface VictoryWays {
  readonly next: string | null;
  readonly back: 'hub' | 'epilogue';
}

/**
 * The ways on from winning `levelId`, given the levels the player can see in order (outside teacher
 * mode, without drafts; never the secret flowers). A level not among them, as a secret flower, has
 * no next garden and leads back to the hub.
 */
export function afterVictory(
  levelId: string,
  shown: readonly { readonly id: string }[],
): VictoryWays {
  const at = shown.findIndex((level) => level.id === levelId);
  const next = at === -1 ? undefined : shown[at + 1];
  return {
    next: next === undefined ? null : next.id,
    back: levelId === EPILOGUE_LEVEL ? 'epilogue' : 'hub',
  };
}
