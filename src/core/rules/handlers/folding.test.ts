import { describe, expect, it } from 'vitest';
import { createGraph } from '../../graph/createGraph';
import { createMatching } from '../../matching/createMatching';
import { unwrap } from '../../shared/result';
import type { ActionOutcome } from '../outcome';
import { createGardenState, type GardenState } from '../state';
import { fold } from './fold';
import { foldAt } from './foldAt';
import { markMoon } from './markMoon';
import { markRoot } from './markRoot';
import { unfold } from './unfold';

/** The new state of an accepted action; a refusal here is a test bug. */
const ok = (outcome: ActionOutcome): GardenState => {
  if (!outcome.ok) throw new Error(`refused: ${outcome.reason.code}`);
  return outcome.state;
};

// Level 4.1/4.4: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5.
const festivalGraph = unwrap(
  createGraph(6, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [3, 5],
  ]),
);
const festival = createGardenState({
  graph: festivalGraph,
  matching: unwrap(
    createMatching(festivalGraph, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: ['markRoot', 'markMoon', 'foldAt', 'fold', 'unfold'],
});

/** The player's search of level 4.1: R sun, a moon, b sun, c moon, d sun. */
const betrayed = [
  (s: GardenState) => markRoot(s, { type: 'markRoot', vertex: 0 }),
  (s: GardenState) => markMoon(s, { type: 'markMoon', from: 0, to: 1 }),
  (s: GardenState) => markMoon(s, { type: 'markMoon', from: 2, to: 3 }),
].reduce((state, move) => ok(move(state)), festival);

describe('fold at the conflict (level 4.4)', () => {
  it('touching d–b folds the triangle into a flower that shines as a sun', () => {
    const outcome = foldAt(betrayed, { type: 'foldAt', from: 4, to: 2 });
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'oddCycleFound', vine: [2, 4] },
      {
        type: 'contract',
        blossom: 0,
        base: 2,
        cycle: [2, 4, 3].map((vertex) => ({ kind: 'sprout', vertex })),
      },
    ]);
    // Folded garden: R a F e = 0 1 2 3.
    expect(outcome.ok && outcome.state.search?.label).toEqual(['outer', 'inner', 'outer', 'none']);
  });

  it('the order of the touch does not matter: d–b and b–d fold the same flower', () => {
    expect(foldAt(betrayed, { type: 'foldAt', from: 2, to: 4 })).toEqual(
      foldAt(betrayed, { type: 'foldAt', from: 4, to: 2 }),
    );
  });

  it('from the flower, c–e is explored and the chain appears, already unfolded', () => {
    const folded = ok(foldAt(betrayed, { type: 'foldAt', from: 4, to: 2 }));
    const outcome = markMoon(folded, { type: 'markMoon', from: 3, to: 5 });
    expect(outcome.ok && outcome.state.chainSeen).toEqual([0, 1, 2, 4, 3, 5]);
  });

  it('only two suns of one tree can be folded', () => {
    expect(foldAt(betrayed, { type: 'foldAt', from: 3, to: 5 })).toEqual({
      ok: false,
      reason: { code: 'notSunsOfOneTree', u: 3, v: 5 },
    });
    expect(foldAt(betrayed, { type: 'foldAt', from: 0, to: 2 })).toEqual({
      ok: false,
      reason: { code: 'notAdjacent', u: 0, v: 2 },
    });
  });

  it('two petals of one flower are already one node', () => {
    const folded = ok(foldAt(betrayed, { type: 'foldAt', from: 4, to: 2 }));
    expect(markMoon(folded, { type: 'markMoon', from: 2, to: 3 })).toEqual({
      ok: false,
      reason: { code: 'insideOneFlower', u: 2, v: 3 },
    });
  });
});

describe('fold a chosen loop', () => {
  it('folds a valid flower when no search is going on', () => {
    const outcome = fold(festival, { type: 'fold', loop: [3, 4, 2] });
    expect(outcome.ok && outcome.state.layer.nodes.length).toBe(4);
  });

  it('says why a loop is not a flower', () => {
    expect(fold(festival, { type: 'fold', loop: [0, 1, 2] })).toMatchObject({
      ok: false,
      reason: { code: 'notAFlower', error: { code: 'notAdjacent' } },
    });
  });

  it('during a search, flowers are folded where two suns meet', () => {
    expect(fold(betrayed, { type: 'fold', loop: [2, 3, 4] })).toEqual({
      ok: false,
      reason: { code: 'searchInProgress' },
    });
  });
});

describe('unfold a flower (level 4.5)', () => {
  const folded = ok(foldAt(betrayed, { type: 'foldAt', from: 4, to: 2 }));

  it('opens the flower, wipes the marks, and keeps the chain that was seen', () => {
    const withChain = ok(markMoon(folded, { type: 'markMoon', from: 3, to: 5 }));
    const outcome = unfold(withChain, { type: 'unfold', blossom: 0 });
    expect(outcome.ok && outcome.state.layer).toEqual(festival.layer);
    expect(outcome.ok && outcome.state.search).toBeNull();
    expect(outcome.ok && outcome.state.chainSeen).toEqual([0, 1, 2, 4, 3, 5]);
    expect(outcome.ok && outcome.events).toEqual([
      { type: 'expand', blossom: 0 },
      { type: 'searchCleared' },
    ]);
  });

  it('only a folded flower on top can be opened', () => {
    expect(unfold(folded, { type: 'unfold', blossom: 7 })).toEqual({
      ok: false,
      reason: { code: 'noSuchFlower', blossom: 7 },
    });
  });
});
