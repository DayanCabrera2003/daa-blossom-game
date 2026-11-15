import lines from '@content/es/lines.json';
import strings from '@content/es/strings.json';
import { checkVertexCover } from '@core/certificates/vertexCover';
import { idOf } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import { isExposed, size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import { itemAt } from '@core/shared/itemAt';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { gardenAtPlay } from '@levels/playStart';
import { hintsAt } from '@levels/stepHints';
import { describe, expect, it } from 'vitest';

/**
 * What the mentor says about a garden is true of that garden, checked with the core: the lines
 * that count the moves of a demo, name who was left in the dark, count scarecrows or call a flower
 * a sun say only what every way of playing the level makes true.
 */

const text = lines as Readonly<Record<string, string>>;

/** The text of a line, which must exist. */
const lineOf = (id: string): string => {
  const said = text[id];
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

/** The names of the sprouts in the dark in a garden. */
const darkOf = (level: Level, state: GardenState): string[] =>
  level.labels.names.filter((_, v) => isExposed(state.matching, v));

/** The words of a text written with a capital letter anywhere but at the start of a sentence. */
const namesIn = (said: string): string[] => said.match(/(?<=[^.!?¿¡«\s]\s+)\p{Lu}\p{Ll}*/gu) ?? [];

describe('lines that tell the truth about their garden', () => {
  it('1.2: the demo is two passes and a new lantern, and then there is room for one more', () => {
    const level = levelOf('1.2');
    const replay = level.flow.find((step) => step.step === 'replay');
    const demo = replay?.step === 'replay' ? replay.demo : undefined;
    if (demo === undefined) throw new Error('1.2 replays a demo');
    expect(demo.map((move) => move.type)).toEqual(['passLantern', 'passLantern', 'join']);
    expect(size(play(level.start, demo).matching)).toBe(size(level.start.matching) + 1);
    expect(lineOf('ch1.2.sauce.00')).toContain('dos pases y un farol nuevo');
  });

  it('1.4: a chain that gains nothing can leave different sprouts in the dark, so none is named', () => {
    const level = levelOf('1.4');
    const chain = (...names: string[]): Action => ({
      type: 'chain',
      path: names.map((name) => sprout(level, name)),
    });
    const left = [chain('A', 'B', 'C', 'D', 'E'), chain('A', 'F', 'G'), chain('H', 'G', 'F')].map(
      (move) => {
        const after = play(level.start, [move]);
        expect(size(after.matching)).toBe(size(level.start.matching));
        return darkOf(level, after).sort();
      },
    );
    expect(left).toEqual([
      ['E', 'H'],
      ['G', 'H'],
      ['A', 'F'],
    ]);
    expect(namesIn(lineOf('ch1.4.sauce.00'))).toEqual([]);
  });

  it('7.1: four scarecrows win too, so the closing lines never count three', () => {
    const level = levelOf('7.1');
    const { victory } = level.data;
    if (victory === undefined) throw new Error('7.1 is won');
    const four = ['A', 'B', 'C', 'E'].map((name) => sprout(level, name));
    const won = play(gardenAtPlay(level), [
      ...four.map((vertex): Action => ({ type: 'placeScarecrow', vertex })),
      { type: 'declareDone' },
    ]);
    expect(isVictory(won, victory)).toBe(true);
    // One of the four can go and the rest still watch every vine: not "any one" leaves one bare.
    const three = four.filter((vertex) => vertex !== sprout(level, 'B'));
    expect(checkVertexCover(level.graph, three).ok).toBe(true);
    // But two never watch the ring of five.
    for (let a = 0; a < level.graph.n; a++) {
      for (let b = a + 1; b < level.graph.n; b++) {
        expect(checkVertexCover(level.graph, [a, b]).ok).toBe(false);
      }
    }
    const closing = level.flow
      .flatMap((step) =>
        step.step === 'ask'
          ? [step.prompt, ...step.options.flatMap((option) => [option.line, option.reply])]
          : [],
      )
      .filter((id): id is string => id !== undefined);
    expect(closing).toHaveLength(7);
    for (const id of closing) {
      const said = lineOf(id);
      expect(said, id).not.toMatch(/\b(tres|cuatro|cinco) espantapájaros\b/);
      expect(said, id).not.toMatch(/cualquiera/);
    }
  });

  it('5.1: once folded, the small flower is a sun, and it touches another sun', () => {
    const level = levelOf('5.1');
    const firstFold = level.solution.findIndex((move) => move.type === 'foldAt');
    const folded = play(gardenAtPlay(level), level.solution.slice(0, firstFold + 1));
    const flower = itemAt(folded.layer.nodeOf, sprout(level, 'c'));
    const sun = itemAt(folded.layer.nodeOf, sprout(level, 'g'));
    expect(folded.search?.label[flower]).toBe('outer');
    expect(folded.search?.label[sun]).toBe('outer');
    expect(level.solution[firstFold + 1]).toEqual({
      type: 'foldAt',
      from: sprout(level, 'c'),
      to: sprout(level, 'g'),
    });
    expect(lineOf('ch5.1.sauce.01')).toBe(
      'La flor pequeña ya brilla como un sol. ¿Toca a otro sol?',
    );
  });

  it('5.2: the grade-2 hint looks at the last loop, closed once the flowers inside are folded', () => {
    const level = levelOf('5.2');
    const folds = level.solution.filter((move) => move.type === 'foldAt');
    const highlight = new Set(level.hints[1]?.highlight);
    const last = folds[folds.length - 1];
    if (last?.type !== 'foldAt') throw new Error('5.2 folds');
    expect(folds).toHaveLength(3);
    expect(highlight.has(last.from) && highlight.has(last.to)).toBe(true);
    expect(lineOf('ch5.2.sauce.02')).toBe(lineOf('ch5.6.sauce.02'));
  });

  it('the card of questions invites no hint: most questions offer none, and a mistake costs nothing', () => {
    const silent = catalog().flatMap((level) =>
      level.flow.filter((step, i) => step.step === 'ask' && hintsAt(level, i) === null),
    );
    expect(silent.length).toBeGreaterThan(0);
    const body = (strings as Readonly<Record<string, string>>)['tutorial.question.body'];
    expect(body).not.toContain('Pista');
    expect(body).toContain('Equivocarse no cuesta nada');
  });
});
