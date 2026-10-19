import { createGraph } from '@core/graph/createGraph';
import type { VertexId } from '@core/graph/types';
import { createMatching } from '@core/matching/createMatching';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import { createGardenState, type GardenState } from '@core/rules/state';
import { unwrap } from '@core/shared/result';
import type { Level } from '@levels/build';
import { catalog } from '@levels/catalog';
import { describe, expect, it } from 'vitest';
import { foundChain, type FoundChain } from '../systems/liftGaps';
import {
  extendLift,
  NO_FILLS,
  releaseLift,
  startsLift,
  type LiftFills,
  type LiftStep,
} from './liftDrag';

const levelById = (id: string): Level => {
  const level = catalog().find((candidate) => candidate.data.id === id);
  if (level === undefined) throw new Error(`no level ${id}`);
  return level;
};

/** Applies moves the rules must accept, keeping every state of the day. */
function play(start: GardenState, actions: readonly Action[]): GardenState[] {
  const day = [start];
  for (const action of actions) {
    const outcome = applyAction(day[day.length - 1] as GardenState, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    day.push(outcome.state);
  }
  return day;
}

/** A level's reference solution played up to its last move, the chain: what the player has then. */
function beforeLighting(level: Level): { state: GardenState; found: FoundChain } {
  const day = play(level.start, level.solution.slice(0, -1));
  const found = foundChain(day, day.length - 1);
  if (found === null) throw new Error('no chain found');
  return { state: day[day.length - 1] as GardenState, found };
}

/** The ids of sprouts named as in the level file. */
const ids = (level: Level, names: string): VertexId[] =>
  [...names].map((name) => level.data.sprouts.findIndex((sprout) => sprout.label === name));

/** A chain read either way round. */
const eitherWay = (path: readonly VertexId[]): VertexId[][] => [[...path], [...path].reverse()];

/** A drag through these sprouts from the first, move by move; the last step. */
function drag(found: FoundChain, state: GardenState, path: readonly VertexId[]) {
  let step: LiftStep = { path: path.slice(0, 1), rejection: null, tried: path.slice(0, 1) };
  for (const v of path.slice(1)) {
    step = extendLift(found, state, step.path, v);
    if (step.rejection !== null) break;
  }
  return step;
}

describe('the gesture of lifting in 4.5 (GDD 4.5, plan 10 phase 2)', () => {
  const level = levelById('4.5');
  const { state, found } = beforeLighting(level);

  it('a press on the lit ends of the open gap starts a lift; elsewhere it does not', () => {
    expect(startsLift(found, state, ids(level, 'b')[0] as number)).toBe(true);
    expect(startsLift(found, state, ids(level, 'c')[0] as number)).toBe(true);
    expect(startsLift(found, state, ids(level, 'd')[0] as number)).toBe(false);
    expect(startsLift(found, state, ids(level, 'a')[0] as number)).toBe(false);
    expect(startsLift(null, state, ids(level, 'b')[0] as number)).toBe(false);
  });

  it('the drag b–d=c fills the gap and composes R a b d c e, which the rules accept', () => {
    const step = drag(found, state, ids(level, 'bdc'));
    expect(step.rejection).toBeNull();
    const released = releaseLift(found, state, NO_FILLS, step.path);
    expect(released.kind).toBe('composed');
    if (released.kind !== 'composed') return;
    expect(eitherWay(ids(level, 'Rabdce'))).toContainEqual(
      (released.action as Extract<Action, { type: 'chain' }>).path,
    );
    const outcome = applyAction(state, released.action);
    expect(outcome.ok).toBe(true);
  });

  it('the same stretch dragged from c, the petal the chain entered by, does the same', () => {
    const step = drag(found, state, ids(level, 'cdb'));
    const released = releaseLift(found, state, NO_FILLS, step.path);
    expect(released.kind === 'composed' && applyAction(state, released.action).ok).toBe(true);
  });

  it('the drag b–c composes a chain the rules refuse as not alternating', () => {
    const step = drag(found, state, ids(level, 'bc'));
    const released = releaseLift(found, state, NO_FILLS, step.path);
    expect(released.kind).toBe('composed');
    if (released.kind !== 'composed') return;
    const outcome = applyAction(state, released.action);
    expect(outcome).toMatchObject({
      ok: false,
      reason: { code: 'invalidPath', error: { code: 'notAlternating' } },
    });
  });

  it('from c, the wrong side c–b is refused at once: Cleo already has a lantern', () => {
    const step = drag(found, state, ids(level, 'cb'));
    expect(step.rejection).toMatchObject({
      code: 'invalidPath',
      error: { code: 'notAlternating', index: 1 },
    });
    // The toast names the sprouts tried, the found sprout e before the gap first.
    expect(step.tried).toEqual(ids(level, 'ecb'));
    expect(step.path).toEqual(ids(level, 'c'));
  });

  it('a move off the flower leaves the drag put; going back takes the last step back', () => {
    const [b, d, a] = ids(level, 'bda') as [number, number, number];
    expect(extendLift(found, state, [b], a).path).toEqual([b]);
    expect(extendLift(found, state, [b, d], b).path).toEqual([b]);
    expect(extendLift(found, state, [b, d], d).path).toEqual([b, d]);
  });

  it('a drag that does not run from one end of the gap to the other is no lift', () => {
    expect(releaseLift(found, state, NO_FILLS, ids(level, 'bd')).kind).toBe('notLift');
    expect(releaseLift(found, state, NO_FILLS, ids(level, 'b')).kind).toBe('notLift');
    expect(releaseLift(null, state, NO_FILLS, ids(level, 'bdc')).kind).toBe('notLift');
    // The whole chain dragged from R is a chain as always.
    expect(releaseLift(found, state, NO_FILLS, ids(level, 'Rabdce')).kind).toBe('notLift');
  });
});

describe('the gesture of lifting in 5.1, flowers nested', () => {
  const level = levelById('5.1');
  const { state, found } = beforeLighting(level);

  it('with both flowers open, filling the one gap gives the chain of the solution', () => {
    // R is the base of the outer flower and the end of the chain, in the dark: a drag from it
    // starts as a chain does, and stopping at a, the gap's other end, makes it a fill.
    expect(startsLift(found, state, ids(level, 'R')[0] as number)).toBe(false);
    const released = releaseLift(found, state, NO_FILLS, ids(level, 'Rhgcdba'));
    expect(released.kind).toBe('composed');
    if (released.kind !== 'composed') return;
    expect(eitherWay(ids(level, 'Rhgcdbat'))).toContainEqual(
      (released.action as Extract<Action, { type: 'chain' }>).path,
    );
    expect(applyAction(state, released.action).ok).toBe(true);
  });

  it('a drag from a, the lit end, fills it the other way round', () => {
    expect(startsLift(found, state, ids(level, 'a')[0] as number)).toBe(true);
    const step = drag(found, state, ids(level, 'abdcghR'));
    expect(step.rejection).toBeNull();
    const released = releaseLift(found, state, NO_FILLS, step.path);
    expect(released.kind === 'composed' && applyAction(state, released.action).ok).toBe(true);
  });
});

// Two flowers crossed by one chain: R–a=b, flower b c d (c=d), c–e=f, flower f g h (g=h), g–T.
// R a b c d e f g h T = 0…9. The light, from R, folds both and sees R–a=b–d=c–e=f–h=g–T.
const twoGraph = unwrap(
  createGraph(10, [
    [0, 1],
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 4],
    [3, 5],
    [5, 6],
    [6, 7],
    [6, 8],
    [7, 8],
    [7, 9],
  ]),
);
const twoStart = createGardenState({
  graph: twoGraph,
  matching: unwrap(
    createMatching(twoGraph, [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]),
  ),
  allowed: ['stepLight', 'foldAt', 'unfold', 'chain'],
  roots: [0],
  chains: { rule: 'seen' },
});

/** Advances the light, folding wherever it stops at a flower, until it sees a chain. */
function lightUntilFound(start: GardenState): GardenState[] {
  const day = [start];
  for (let guard = 0; guard < 50; guard += 1) {
    const now = day[day.length - 1] as GardenState;
    if (now.chainSeen !== null) return day;
    const outcome = applyAction(now, { type: 'stepLight' });
    if (outcome.ok) {
      day.push(outcome.state);
      continue;
    }
    if (outcome.reason.code !== 'lightAtFlower') throw new Error(outcome.reason.code);
    const { u, v } = outcome.reason;
    day.push(...play(now, [{ type: 'foldAt', from: u, to: v }]).slice(1));
  }
  throw new Error('the light never found the chain');
}

describe('the gesture of lifting with two gaps', () => {
  const found = lightUntilFound(twoStart);
  const atFind = found[found.length - 1] as GardenState;
  // Open both flowers (outermost ids first, whatever they are).
  const open = atFind.layer.nodes.flatMap((node) => (node.kind === 'blossom' ? [node.id] : []));
  const day = play(
    atFind,
    open.map((blossom): Action => ({ type: 'unfold', blossom })),
  );
  const all = [...found, ...day.slice(1)];
  const state = all[all.length - 1] as GardenState;
  const seen = foundChain(all, all.length - 1) as FoundChain;

  it('has one gap per flower crossed', () => {
    expect(seen.gaps).toHaveLength(2);
  });

  it('a first gap filled waits for the other; the second composes the whole chain', () => {
    const first = releaseLift(seen, state, NO_FILLS, [2, 4, 3]);
    expect(first.kind).toBe('filled');
    if (first.kind !== 'filled') return;
    const second = releaseLift(seen, state, first.fills, [6, 8, 7]);
    expect(second.kind).toBe('composed');
    if (second.kind !== 'composed') return;
    expect(eitherWay([0, 1, 2, 4, 3, 5, 6, 8, 7, 9])).toContainEqual(
      (second.action as Extract<Action, { type: 'chain' }>).path,
    );
    expect(applyAction(state, second.action).ok).toBe(true);
  });

  it('a gap filled the wrong way while another is open is refused at once', () => {
    const wrong = releaseLift(seen, state, NO_FILLS, [2, 3]);
    expect(wrong).toMatchObject({
      kind: 'refused',
      reason: { code: 'invalidPath', error: { code: 'notAlternating' } },
    });
  });

  it('fills of another chain no longer count', () => {
    const first = releaseLift(seen, state, NO_FILLS, [2, 4, 3]);
    if (first.kind !== 'filled') throw new Error('not filled');
    const stale: LiftFills = { chain: [...seen.chain], fills: first.fills.fills };
    expect(releaseLift(seen, state, stale, [6, 8, 7]).kind).toBe('filled');
  });
});
