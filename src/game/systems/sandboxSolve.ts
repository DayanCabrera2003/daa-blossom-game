import { RIGHT_RECIPE } from '@core/recipe/recipe';
import { AUTOMATON_MOVES, runOptionsOf, runRecipe } from '@core/recipe/run';
import type { GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import { appendDay } from './appendDay';
import { lentDay } from './lentDay';
import { garden, takesMoves, type LevelSession } from './levelSession';
import type { PlayedDay } from './playedDay';

/**
 * The mechanical gardener solving a garden of the free mode (GDD §5.7; plan 08, phase 13). He has no
 * algorithm of his own: he runs the right recipe of 6.1 (`runRecipe` of the core) from the garden
 * the player is looking at, with every tool of his run lent to him, even those the player has not
 * learnt (he shows them, he never hands them over). His run is added to the player's day as moves
 * the rules accepted, so the sun walks it step by step: the suns and moons of each search, the
 * flowers folded and opened, the chains lit, and his "Terminé", which keeps the marks of the last
 * search for the certificate. Solving never wins the garden: saying "Terminé" stays the player's.
 */

/** The gardener's day from the garden `from`: his moves, one garden each, with their events. */
export function gardenerDay(from: GardenState): PlayedDay {
  const options = runOptionsOf(RIGHT_RECIPE);
  invariant(options !== null, 'the right recipe always runs');
  return lentDay(from, runRecipe(from, options), AUTOMATON_MOVES, "the mechanical gardener's run");
}

/**
 * The session with the gardener's day after the garden shown (dropping anything undone, as a move
 * would), and that day; null while the script holds the garden (a question, a replay), when no move
 * is taken either.
 */
export function solveSession(
  session: LevelSession,
): { readonly session: LevelSession; readonly day: PlayedDay } | null {
  if (!takesMoves(session)) return null;
  const day = gardenerDay(garden(session));
  return { session: appendDay(session, day), day };
}
