import { runRecipe } from '@core/recipe/run';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { describe, expect, it } from 'vitest';
import { twoComponentsLevel } from '../../../tests/support/fixtureLevels';
import { moonGlow } from './moonGlow';

/** Plays moves; a refusal here is a test bug. */
const play = (from: GardenState, moves: readonly Action[]): GardenState =>
  moves.reduce((state, move) => {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${outcome.reason.code}`);
    return outcome.state;
  }, from);

describe('the moons that glow, to be lifted as stones (7.4)', () => {
  const level = twoComponentsLevel();
  const moonsWanted = { type: 'moonCertificate' } as const;
  // The automaton searches the garden to the end: a and a′ (1 and 6) are its moons.
  const searched = play(level.start, runRecipe(level.start, { fold: true }));

  it('once the search is over, every moon not yet lifted glows', () => {
    expect(moonGlow(moonsWanted, searched)).toEqual([1, 6]);
    expect(moonGlow(moonsWanted, play(searched, [{ type: 'liftStone', vertex: 1 }]))).toEqual([6]);
  });

  it('nothing glows while the search is not over, nor where the stones are free to choose', () => {
    expect(moonGlow(moonsWanted, level.start)).toEqual([]);
    expect(moonGlow({ type: 'tutteBergeCertificate' }, searched)).toEqual([]);
    expect(moonGlow(undefined, searched)).toEqual([]);
  });
});
