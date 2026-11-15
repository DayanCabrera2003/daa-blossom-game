import lines from '@content/es/lines.json';
import { baseVertex, members } from '@core/blossom/hierarchy';
import type { Blossom } from '@core/blossom/types';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { gardenAtPlay } from '@levels/playStart';
import { describe, expect, it } from 'vitest';

/**
 * What the mentor and the notebook say about flowers, and about who searches, is true of the
 * gardens they speak of, checked with the core: which petal is the base, where a chain touches a
 * flower inside another and which way round it goes, which lanterns turning the stem moves, and
 * whether the level searches by hand with the marks.
 */

const lineTable: Readonly<Record<string, string>> = lines;

/** The text of a line, which must exist. */
const lineOf = (id: string): string => {
  const said = lineTable[id];
  if (said === undefined) throw new Error(`no line ${id}`);
  return said;
};

const levelOf = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** A sprout of a level, by name. */
const sprout = (level: Level, name: string): VertexId => {
  const vertex = idOf(level.labels, name);
  if (vertex === undefined) throw new Error(`no sprout ${name} in ${level.data.id}`);
  return vertex;
};

/** Plays moves from a garden; every one must be accepted. */
const play = (from: GardenState, moves: readonly Action[]): GardenState =>
  moves.reduce((state, move) => {
    const outcome = applyAction(state, move);
    if (!outcome.ok) throw new Error(`refused: ${JSON.stringify(outcome.reason)}`);
    return outcome.state;
  }, from);

/** The garden after the reference solution up to its `count`-th move of kind `type`, included. */
const after = (level: Level, type: Action['type'], count = 1): GardenState => {
  const at = level.solution.flatMap((move, index) => (move.type === type ? [index] : []));
  const last = at[count - 1];
  if (last === undefined) throw new Error(`no move ${type} number ${count}`);
  return play(gardenAtPlay(level), level.solution.slice(0, last + 1));
};

/** The one flower folded in a garden, outermost. */
const onlyFlower = (state: GardenState): Blossom => {
  const flowers = state.layer.nodes.filter((node): node is Blossom => node.kind === 'blossom');
  const [flower, ...others] = flowers;
  if (flower === undefined || others.length > 0) throw new Error('not exactly one flower');
  return flower;
};

/** The chain of the reference solution of a level. */
const chainOf = (level: Level): VertexId[] => {
  const chain = level.solution.find((move) => move.type === 'chain');
  if (chain?.type !== 'chain') throw new Error(`${level.data.id} lights no chain`);
  return [...chain.path];
};

/**
 * Where the chain of a level touches its first flower, a flower of sprouts only, once every flower
 * is open: the two petals at the ends of its run through the flower, whether that run is one piece,
 * how many petals it crosses, and the chain that goes the other way round between the same two.
 */
function touchOf(level: Level) {
  const inner = onlyFlower(after(level, 'foldAt'));
  const cycle = inner.cycle.map((node) => {
    if (node.kind !== 'sprout') throw new Error('the inner flower folds sprouts only');
    return node.vertex;
  });
  const path = chainOf(level);
  const inside = path.flatMap((vertex, at) => (cycle.includes(vertex) ? [at] : []));
  const first = inside[0] ?? -1;
  const last = inside.at(-1) ?? -1;
  const [entry, exit] = [itemAt(path, first), itemAt(path, last)];
  // The other way round the loop, from `entry` to `exit`: the petals the run did not cross.
  const step = cycle.indexOf(itemAt(path, first + 1)) === (cycle.indexOf(entry) + 1) % cycle.length;
  const around: VertexId[] = [];
  for (let at = cycle.indexOf(entry); ;) {
    around.push(itemAt(cycle, at));
    if (itemAt(cycle, at) === exit) break;
    at = (at + (step ? cycle.length - 1 : 1)) % cycle.length;
  }
  return {
    base: baseVertex(inner),
    entry,
    exit,
    oneRun: last - first + 1 === inside.length,
    crossed: inside.length,
    petals: cycle.length,
    otherWay: [...path.slice(0, first), ...around, ...path.slice(last + 1)],
  };
}

describe('what is said about flowers holds in their gardens', () => {
  it('4.7: the base is the one petal whose lantern goes out of the flower, or has none', () => {
    const level = levelOf('4.7');
    const folded = after(level, 'foldAt');
    const flower = onlyFlower(folded);
    const petals = members(flower);
    const { mate } = folded.matching;
    const partnerOutside = petals.filter((petal) => !petals.includes(itemAt(mate, petal)));
    expect(partnerOutside).toEqual([baseVertex(flower)]);
    expect(baseVertex(flower)).toBe(sprout(level, 'd'));
    expect(lineOf('ch4.7.sauce.00')).toContain(
      'fíjate en qué pétalo tiene su farol fuera de la flor',
    );
    expect(lineOf('ch4.7.notebook.06')).toBe(
      '…el único pétalo sin pareja dentro: su farol sale, o no tiene.',
    );
  });

  it('4.10: turning the stem moves only the lanterns of the stem, from R to the base', () => {
    const level = levelOf('4.10');
    const [turn] = level.solution;
    if (turn?.type !== 'rotateStem') throw new Error('4.10 starts by turning the stem');
    const stem = ['R', 'a', 'b'].map((name) => sprout(level, name));
    expect(turn.stem).toEqual(stem);
    const before = gardenAtPlay(level);
    const turned = play(before, [turn]);
    const moved = before.matching.mate.flatMap((partner, v) =>
      turned.matching.mate[v] === partner ? [] : [v],
    );
    expect(moved.every((v) => stem.includes(v))).toBe(true);
    expect(lineOf('ch4.10.sauce.01')).toBe(
      'Cuando una flor te estorba, prueba a mover los faroles del tallo.',
    );
  });

  it('5.1: the chain touches the small flower at two petals, and only one way round alternates', () => {
    const level = levelOf('5.1');
    const touch = touchOf(level);
    expect(touch.oneRun).toBe(true);
    // Its chain is drawn from R, so it reaches c first; the line names the petals from t.
    expect([touch.exit, touch.entry]).toEqual([sprout(level, 'b'), sprout(level, 'c')]);
    // The run between them goes through d; the other way round, b–c, is refused.
    expect(touch.crossed).toBe(3);
    const opened = after(level, 'unfold', 2);
    expect(applyAction(opened, { type: 'chain', path: touch.otherWay }).ok).toBe(false);
    expect(applyAction(opened, { type: 'chain', path: chainOf(level) }).ok).toBe(true);
    expect(lineOf('ch5.1.sauce.04')).toContain(
      'La cadena toca la flor pequeña en dos pétalos, b y c; entre los dos, solo una vuelta alterna: la que pasa por d.',
    );
  });

  it('5.3: the chain touches the small flower at f, not its base, and at b, the long way round', () => {
    const level = levelOf('5.3');
    const touch = touchOf(level);
    expect(touch.oneRun).toBe(true);
    expect([touch.entry, touch.exit]).toEqual([sprout(level, 'f'), sprout(level, 'b')]);
    expect(touch.entry).not.toBe(touch.base);
    // The long way: more than half the petals.
    expect(touch.crossed * 2).toBeGreaterThan(touch.petals);
    const opened = after(level, 'unfold', 2);
    expect(applyAction(opened, { type: 'chain', path: touch.otherWay }).ok).toBe(false);
    expect(lineOf('ch5.3.sauce.04')).toContain(
      'La cadena toca la flor pequeña en dos pétalos, f y b, y f no es su base; entre los dos, solo una vuelta alterna: aquí, la larga.',
    );
  });

  it('4.11: the right statement says folding keeps the answer, both ways', () => {
    expect(lineOf('ch4.11.notebook.08')).toBe(
      '…no cambia la respuesta: si había cadena, sigue habiéndola; si no, no aparece ninguna.',
    );
  });
});
