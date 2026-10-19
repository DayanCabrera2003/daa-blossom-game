import { members } from '@core/blossom/hierarchy';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { lightStep } from '@core/rules/lightStep';
import type { GardenState } from '@core/rules/state';
import { isVictory } from '@core/rules/victory';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { explore } from './support/gardenExplorer';

// The flower levels where the light searches by itself (plan 10, section 2.4; GDD §5.1, "La luz
// busca"). For each one: the light, advanced alone in its fixed order from the roots the level's
// design implies, meets the very flowers the level is about (those its reference solution folds),
// and folding is the only way on: no order of the moves the level allows wins without it.

/**
 * Each level, the roots its light starts from (null: every sprout in the dark, in order) and the
 * flowers the light folds when advanced alone, each by its petals' names in alphabetical order,
 * with "|" where a chain is lit and a new round starts.
 */
const FLOWER_LEVELS: Readonly<Record<string, { roots: string[] | null; flowers: string[] }>> = {
  '4.4': { roots: ['R'], flowers: ['bcd'] },
  '4.5': { roots: ['R'], flowers: ['bcd', '|'] },
  '4.6': { roots: ['R'], flowers: ['bcdfg', '|'] },
  '4.7': { roots: ['R'], flowers: ['def', '|'] },
  '4.8': { roots: ['R'], flowers: ['bcd', 'hij', '|'] },
  '4.12': { roots: null, flowers: ['bcd', '|', 'klmoq', '|'] },
  '5.1': { roots: ['R'], flowers: ['bcd', 'Rabcdgh', '|'] },
};

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** Applies a move the rules must accept. */
const play = (state: GardenState, action: Action): GardenState => {
  const outcome = applyAction(state, action);
  if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
  return outcome.state;
};

/** Plays a move and names the flower it folded, if any, by its petals in alphabetical order. */
const folding = (level: Level, state: GardenState, action: Action) => {
  const after = play(state, action);
  const before = new Set(state.layer.nodes.flatMap((node) => [node.id]));
  const flower = after.layer.nodes.find((node) => node.kind === 'blossom' && !before.has(node.id));
  const name =
    flower === undefined
      ? null
      : members(flower)
          .map((v) => level.labels.names[v] ?? '?')
          .sort()
          .join('');
  return { after, name };
};

/** Whether the level's victory holds, "Terminé" taken as said. */
const wins = (level: Level) => (state: GardenState) => {
  const { victory } = level.data;
  if (victory === undefined) throw new Error(`level ${level.data.id} has no victory`);
  return isVictory({ ...state, declaredDone: true }, victory);
};

/**
 * The light advanced alone through the level, in the clear: folding where it stops, then the chain
 * it saw opened and lit, round after round, until it has nothing left to look at or the level is
 * won. The flowers it folded, in order, with "|" for each chain lit.
 */
function lightAlone(level: Level): string[] {
  let state: GardenState = {
    ...level.start,
    revealed: level.start.revealed === null ? null : level.start.revealed.map(() => true),
  };
  const flowers: string[] = [];
  for (let guard = 0; guard < 500 && !wins(level)(state); guard++) {
    const step = lightStep(state);
    if (step.kind === 'move') {
      state = play(state, { type: 'stepLight' });
    } else if (step.kind === 'flower') {
      const folded = folding(level, state, { type: 'foldAt', from: step.from, to: step.to });
      if (folded.name !== null) flowers.push(folded.name);
      state = folded.after;
    } else if (step.kind === 'found' && state.chainSeen !== null) {
      const chain = state.chainSeen;
      for (let top = state.layer.nodes.find((node) => node.kind === 'blossom'); top;) {
        state = play(state, { type: 'unfold', blossom: top.id });
        top = state.layer.nodes.find((node) => node.kind === 'blossom');
      }
      state = play(state, { type: 'chain', path: chain });
      flowers.push('|');
    } else {
      break;
    }
  }
  return flowers;
}

/** The flowers the reference solution folds, by their petals, in order. */
function referenceFlowers(level: Level): string[] {
  let state = level.start;
  const flowers: string[] = [];
  for (const action of level.solution) {
    const folded = folding(level, state, action);
    if (action.type === 'foldAt' && folded.name !== null) flowers.push(folded.name);
    state = folded.after;
  }
  return flowers;
}

describe.each(Object.entries(FLOWER_LEVELS))('%s: the light searches by itself', (id, expected) => {
  const level = levelById(id);

  it('starts from the roots of its design, and the player only advances it', () => {
    expect(level.data.light).toBe(true);
    expect(level.data.roots ?? null).toEqual(expected.roots);
    expect(level.start.allowed.has('stepLight')).toBe(true);
    for (const type of ['markRoot', 'markMoon', 'fold'] as const) {
      expect(level.start.allowed.has(type)).toBe(false);
    }
  });

  it('meets the flowers the level is about, the very ones its reference solution folds', () => {
    const flowers = lightAlone(level);
    expect(flowers).toEqual(expected.flowers);
    const folded = flowers.filter((flower) => flower !== '|').sort();
    expect(folded).toEqual(referenceFlowers(level).sort());
  });

  it('cannot be won without folding, whatever the order of the moves it allows', () => {
    const walk = explore(level.start, { without: ['fold', 'foldAt'], goal: wins(level) });
    expect(walk).toMatchObject({ reached: false, witness: null });
  }, 20_000);

  it('is won by its reference solution, which folds', () => {
    expect(level.solution.some((action) => action.type === 'foldAt')).toBe(true);
    const end = level.solution.reduce(play, level.start);
    expect(wins(level)(end)).toBe(true);
  });
});
