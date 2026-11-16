import { isMaximum, maximumSize } from '@core/edmonds/fast/maximum';
import { createGraph } from '@core/graph/createGraph';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory, statusOf } from '@core/rules/victory';
import { unwrap } from '@core/shared/result';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { fewestDrops } from './support/waterWalk';

// The drops of every fog level (GDD §7, chapter 3, «Las gotas»): the budget is the fewest
// inspections the level can be won with under its rules, found by the exhaustive walk, plus two.
// A sprout is never inspected twice, so a budget of one drop per sprout could never be overspent.

/** Each fog level and the fewest drops the walk finds for it. */
const FEWEST: Readonly<Record<string, number>> = {
  '3.1': 3,
  '3.2': 2,
  '3.4': 3,
  '3.5': 7,
  '3.10': 4,
  '4.12': 9,
  '5.5': 14,
};

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/**
 * Whether the level is won in `state` with a claim the player can stand by. A visible goal counts
 * the lanterns, and a search claimed over is judged as "Terminé" judges it. A hidden one ("Terminé",
 * a certificate of scarecrows) needs the most lanterns and something that shows it: every sprout
 * lit, or the search over without a chain, each sun of it inspected; the scarecrows themselves are
 * placed for free (König's, from that search).
 */
const honestWin = (level: Level) => (state: GardenState) => {
  const { victory } = level.data;
  if (victory === undefined) throw new Error(`level ${level.data.id} has no victory`);
  if (victory.type !== 'maximum' && victory.type !== 'coverCertificate') {
    return isVictory({ ...state, declaredDone: true }, victory);
  }
  const allLit = 2 * size(state.matching) === state.graph.n;
  return isMaximum(state.graph, state.matching) && (allLit || statusOf(state) === 'exhausted');
};

describe.each(Object.entries(FEWEST))(
  '%s: drops for the fewest looks, and two more',
  (id, fewest) => {
    const level = levelById(id);

    it('the walk finds the fewest drops that win it', () => {
      expect(level.start.revealed).not.toBeNull();
      expect(fewestDrops(level.start, { goal: honestWin(level) }).drops).toBe(fewest);
    }, 120_000);

    it('gives exactly two drops more', () => {
      expect(level.data.water).toBe(fewest + 2);
    });
  },
);

/** The sprouts some maximum leaves in the dark (Gallai–Edmonds): the suns of any search over. */
function darkSomewhere(level: Level): VertexId[] {
  const { graph } = level.start;
  const most = maximumSize(graph);
  const without = (v: VertexId) =>
    unwrap(
      createGraph(
        graph.n,
        graph.edges.filter(([a, b]) => a !== v && b !== v),
      ),
    );
  return [...Array(graph.n).keys()].filter((v) => maximumSize(without(v)) === most);
}

describe('3.3: drops for the fewest looks, and two more, its lanterns already the most', () => {
  // With the lanterns free to move, the walk passes millions of gardens, and no lantern move saves
  // a drop: a search is over only on the most lanterns, and then its suns are exactly the sprouts
  // some maximum leaves in the dark, each to be inspected whatever lanterns are lit. So the fewest
  // drops are at least that many, and the walk on the starting lanterns reaches it.
  const level = levelById('3.3');

  it('the walk with the lanterns as they are reaches the bound: one drop for each sun', () => {
    const fewest = darkSomewhere(level).length;
    expect(fewest).toBe(5);
    const still: Action['type'][] = ['join', 'split', 'passLantern', 'chain'];
    const walk = fewestDrops(level.start, { goal: honestWin(level), without: still });
    expect(walk.drops).toBe(fewest);
    expect(level.data.water).toBe(fewest + 2);
  });
});

describe('3.9: drops bounded, as its walk grows too large', () => {
  // Twenty sprouts searched three times over: the walk passes millions of gardens. The fewest drops
  // are bounded instead. From below: the last search, over without a chain, has a sun on each sprout
  // some maximum leaves in the dark, and each must be inspected. One more is needed: the second
  // chain has to reach N or I, and every chain to either passes the lantern H=O, with a sun on H or
  // O, neither of which any maximum leaves in the dark. From above: the reference solution,
  // searched to its end, uses exactly that many.
  const level = levelById('3.9');
  const id = (name: string): VertexId => {
    const vertex = idOf(level.labels, name);
    if (vertex === undefined) throw new Error(`no sprout ${name}`);
    return vertex;
  };

  it('at least one drop for each sprout some maximum leaves in the dark, and one more', () => {
    const dark = darkSomewhere(level);
    expect(dark.length).toBe(11);
    expect(dark).not.toContain(id('H'));
    expect(dark).not.toContain(id('O'));
  });

  it('its reference solution, searched to its end, wins with 12, and the budget is 14', () => {
    const lastLooks: Action[] = ['K', 'L', 'N'].map((name) => ({
      type: 'inspect',
      vertex: id(name),
    }));
    const moves = level.solution.filter((move) => move.type !== 'placeScarecrow');
    const end = [...moves, ...lastLooks].reduce((state, move) => {
      const outcome = applyAction(state, move);
      if (!outcome.ok) throw new Error(`${move.type} refused: ${outcome.reason.code}`);
      return outcome.state;
    }, level.start);
    expect(honestWin(level)(end)).toBe(true);
    expect(end.waterUsed).toBe(12);
    expect(level.data.water).toBe(12 + 2);
  });
});
