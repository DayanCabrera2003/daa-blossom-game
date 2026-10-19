import { checkVertexCover } from '@core/certificates/vertexCover';
import { checkTutteBerge } from '@core/certificates/tutteBerge';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { invariant } from '@core/shared/invariant';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { gardenAtPlay } from '@levels/playStart';
import { describe, expect, it } from 'vitest';
import { claimVerdict } from './claimVerdict';

/** A level of the catalog by its id. */
function levelOf(id: string): Level {
  const found = catalog().find((level) => level.data.id === id);
  invariant(found !== undefined, `the catalog has level ${id}`);
  return found;
}

/** The id of the sprout called `label` in `level`. */
function idOf(level: Level, label: string): number {
  const id = level.data.sprouts.findIndex((sprout) => sprout.label === label);
  invariant(id >= 0, `level ${level.data.id} has a sprout ${label}`);
  return id;
}

/** The garden of `level` at its play step after `moves` (each must be accepted), then "Terminé". */
function claimed(level: Level, moves: readonly Action[]): GardenState {
  let state = gardenAtPlay(level);
  for (const move of [...moves, { type: 'declareDone' } as const]) {
    const outcome = applyAction(state, move);
    invariant(outcome.ok, `the move ${move.type} is accepted`);
    state = outcome.state;
  }
  return state;
}

describe('why a "Terminé" that does not win falls short', () => {
  it('1.8: with three lanterns, a chain is left, and nothing says where', () => {
    const level = levelOf('1.8');
    const id = (label: string) => idOf(level, label);
    const state = claimed(level, [
      { type: 'join', u: id('B'), v: id('C') },
      { type: 'join', u: id('D'), v: id('E') },
      { type: 'join', u: id('F'), v: id('G') },
    ]);
    expect(claimVerdict(state, level.data.victory)).toEqual({ code: 'chainLeft' });
  });

  it('a true "Terminé" has nothing to answer: it wins', () => {
    const level = levelOf('1.8');
    const id = (label: string) => idOf(level, label);
    const state = claimed(level, [
      { type: 'join', u: id('B'), v: id('C') },
      { type: 'join', u: id('D'), v: id('E') },
      { type: 'join', u: id('F'), v: id('G') },
      { type: 'join', u: id('H'), v: id('I') },
    ]);
    expect(claimVerdict(state, level.data.victory)).toBeNull();
  });

  it('4.9: with the search halfway, vines are left to look along', () => {
    const level = levelOf('4.9');
    const state = claimed(level, [{ type: 'markRoot', vertex: idOf(level, 'R') }]);
    expect(claimVerdict(state, level.data.victory)).toEqual({ code: 'searchOpen' });
  });

  it('3.7: two scarecrows that leave the star unguarded show one vine truly unguarded', () => {
    const level = levelOf('3.7');
    const state = claimed(level, [
      { type: 'placeScarecrow', vertex: idOf(level, '2') },
      { type: 'placeScarecrow', vertex: idOf(level, '4') },
    ]);
    const verdict = claimVerdict(state, level.data.victory);
    expect(verdict).toEqual({ code: 'unguarded', vine: [idOf(level, 'H'), idOf(level, 'L1')] });
    invariant(verdict?.code === 'unguarded' && verdict.vine !== null, 'a vine is shown');
    const [u, v] = verdict.vine;
    expect(state.scarecrows).not.toContain(u);
    expect(state.scarecrows).not.toContain(v);
  });

  it('3.7: three scarecrows that guard everything against two lanterns do not match', () => {
    const level = levelOf('3.7');
    const id = (label: string) => idOf(level, label);
    const state = claimed(level, [
      { type: 'split', u: id('4'), v: id('5') },
      { type: 'placeScarecrow', vertex: id('2') },
      { type: 'placeScarecrow', vertex: id('4') },
      { type: 'placeScarecrow', vertex: id('H') },
    ]);
    expect(checkVertexCover(state.graph, state.scarecrows).ok).toBe(true);
    expect(claimVerdict(state, level.data.victory)).toEqual({
      code: 'countMismatch',
      scarecrows: 3,
      lanterns: 2,
    });
  });

  it('in the fog, the vine shown is one the player can see, or none', () => {
    const level = levelOf('3.9');
    const state = claimed(level, []);
    const verdict = claimVerdict(state, level.data.victory);
    // Nothing is inspected yet: every unguarded vine is hidden, so none glows.
    expect(verdict).toEqual({ code: 'unguarded', vine: null });
  });

  it('7.1: scarecrows that leave a vine unguarded are told so, however many lanterns', () => {
    const level = levelOf('7.1');
    const verdict = claimVerdict(claimed(level, []), level.data.victory);
    expect(verdict?.code).toBe('unguarded');
  });

  it('7.3: without stones, the count is short, with the numbers of the Council', () => {
    const level = levelOf('7.3');
    const state = claimed(level, []);
    const proof = checkTutteBerge(state.graph, state.matching, state.stones);
    invariant(!proof.ok && proof.error.code === 'notTight', 'no stones prove nothing here');
    expect(claimVerdict(state, level.data.victory)).toEqual({
      code: 'countShort',
      atLeast: state.graph.n - 2 * proof.error.bound,
      dark: state.graph.n - 2 * proof.error.size,
    });
    expect(claimVerdict(state, level.data.victory)).toEqual({
      code: 'countShort',
      atLeast: 0,
      dark: 2,
    });
  });

  it('7.4: stones that are not the moons of the search are told apart', () => {
    const level = levelOf('7.4');
    const state = claimed(level, [{ type: 'liftStone', vertex: idOf(level, 'R') }]);
    expect(claimVerdict(state, level.data.victory)).toEqual({ code: 'notTheMoons' });
  });

  it('stones presented before the search is over without a chain are told to wait', () => {
    const level = levelOf('7.3');
    const state = claimed(level, [{ type: 'liftStone', vertex: idOf(level, 'C') }]);
    expect(state.search).toBeNull();
    expect(claimVerdict(state, { type: 'moonCertificate' })).toEqual({ code: 'searchNotOver' });
  });

  it('the moons of the search that still do not prove the lanterns are a count short', () => {
    const level = levelOf('7.4');
    const id = (label: string) => idOf(level, label);
    // The moons of the search, with a lantern put out: the count no longer closes.
    const state = claimed(level, [
      { type: 'liftStone', vertex: id('a') },
      { type: 'liftStone', vertex: id('a2') },
    ]);
    expect(claimVerdict(state, level.data.victory)).toBeNull();
    // Only the lanterns' count is judged against the stones, so one put out by hand is enough.
    const out = new Set([id('a2'), id('b2')]);
    const mate = state.matching.mate.map((partner, v) => (out.has(v) ? -1 : partner));
    const fewer: GardenState = { ...state, matching: { mate } };
    expect(claimVerdict(fewer, level.data.victory)?.code).toBe('countShort');
  });

  it('a goal of lanterns not reached leaves a chain; a search not complete leaves vines', () => {
    const level = levelOf('1.8');
    const state = claimed(level, []);
    expect(claimVerdict(state, { type: 'matchingSize', value: 4 })).toEqual({ code: 'chainLeft' });
    expect(claimVerdict(state, { type: 'searchComplete' })).toEqual({ code: 'searchOpen' });
    expect(claimVerdict(state, { type: 'chainFound' })).toEqual({ code: 'searchOpen' });
  });

  it('with no victory to judge, there is nothing to answer', () => {
    expect(claimVerdict(claimed(levelOf('1.8'), []), undefined)).toBeNull();
  });
});
