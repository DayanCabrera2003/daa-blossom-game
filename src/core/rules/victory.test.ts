import { describe, expect, it } from 'vitest';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import { createMatching } from '../matching/createMatching';
import { unwrap } from '../shared/result';
import type { Action } from './actions';
import { applyAction } from './applyAction';
import { createGardenState, type GardenState } from './state';
import { isVictory } from './victory';

// Level 3.7, part I: 1–2–3–4–5 as 0..4, with its maximum of two lanterns.
const path = pathGraph(5);
const twoLit = createGardenState({
  graph: path,
  matching: unwrap(
    createMatching(path, [
      [0, 1],
      [2, 3],
    ]),
  ),
  allowed: [],
});

describe('victory conditions', () => {
  it('matchingSize: enough lanterns are lit', () => {
    expect(isVictory(twoLit, { type: 'matchingSize', value: 2 })).toBe(true);
    expect(isVictory(twoLit, { type: 'matchingSize', value: 3 })).toBe(false);
  });

  it('maximum: "Terminé" wins only when it is true, judged by Edmonds', () => {
    expect(isVictory(twoLit, { type: 'maximum' })).toBe(false);
    expect(isVictory({ ...twoLit, declaredDone: true }, { type: 'maximum' })).toBe(true);
    const oneLit = createGardenState({
      graph: path,
      matching: unwrap(createMatching(path, [[1, 2]])),
      allowed: [],
    });
    expect(isVictory({ ...oneLit, declaredDone: true }, { type: 'maximum' })).toBe(false);
  });

  it('chainFound: the marks reached a chain (level 4.4)', () => {
    expect(isVictory(twoLit, { type: 'chainFound' })).toBe(false);
    expect(isVictory({ ...twoLit, chainSeen: [4, 3] }, { type: 'chainFound' })).toBe(true);
  });

  it('coverCertificate: scarecrows guard every vine, exactly as many as lanterns (3.7)', () => {
    const certify = (scarecrows: number[]) =>
      isVictory({ ...twoLit, scarecrows, declaredDone: true }, { type: 'coverCertificate' });
    expect(certify([1, 3])).toBe(true);
    expect(certify([1])).toBe(false);
    expect(certify([0, 1, 3])).toBe(false);
  });

  it('tutteBergeCertificate: the stones prove the lanterns (the helix, 7.3)', () => {
    const helix = unwrap(
      createGraph(10, [
        [0, 1],
        [0, 4],
        [0, 7],
        [1, 2],
        [2, 3],
        [1, 3],
        [4, 5],
        [5, 6],
        [4, 6],
        [7, 8],
        [8, 9],
        [7, 9],
      ]),
    );
    const garden = createGardenState({
      graph: helix,
      matching: unwrap(
        createMatching(helix, [
          [0, 1],
          [2, 3],
          [4, 5],
          [7, 8],
        ]),
      ),
      allowed: [],
    });
    const presented = { ...garden, declaredDone: true };
    expect(isVictory({ ...presented, stones: [0] }, { type: 'tutteBergeCertificate' })).toBe(true);
    expect(isVictory(presented, { type: 'tutteBergeCertificate' })).toBe(false);
  });

  it('a certificate only counts once it is presented with "Terminé" (GDD §5.2)', () => {
    // Level 7.2: the five-cycle with two lanterns. With no stones lifted the certificate already
    // closes, yet the level must not be won before the player presents it.
    const c5 = createGraph(5, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [0, 4],
    ]);
    const five = createGardenState({
      graph: unwrap(c5),
      matching: unwrap(
        createMatching(unwrap(c5), [
          [0, 1],
          [2, 3],
        ]),
      ),
      allowed: [],
    });
    expect(isVictory(five, { type: 'tutteBergeCertificate' })).toBe(false);
    expect(isVictory({ ...five, declaredDone: true }, { type: 'tutteBergeCertificate' })).toBe(
      true,
    );
    expect(isVictory({ ...twoLit, scarecrows: [1, 3] }, { type: 'coverCertificate' })).toBe(false);
  });
});

/** Plays moves in order; a refusal here is a test bug. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

// Level 4.1: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5; the search starts at R only.
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
const festival = (allowed: readonly Action['type'][]): GardenState =>
  createGardenState({
    graph: festivalGraph,
    matching: unwrap(
      createMatching(festivalGraph, [
        [1, 2],
        [3, 4],
      ]),
    ),
    roots: [0],
    allowed,
  });
const SEARCH: readonly Action[] = [
  { type: 'markRoot', vertex: 0 },
  { type: 'markMoon', from: 0, to: 1 },
  { type: 'markMoon', from: 2, to: 3 },
];

describe('the search as a victory (chapters 3 and 4)', () => {
  it('searchComplete: a search that ends without a chain is complete, even if the light lies (4.2)', () => {
    const start = festival(['markRoot', 'markMoon', 'declareDone']);
    expect(isVictory(start, { type: 'searchComplete' })).toBe(false);
    expect(isVictory(play(start, SEARCH.slice(0, 2)), { type: 'searchComplete' })).toBe(false);
    expect(isVictory(play(start, SEARCH), { type: 'searchComplete' })).toBe(true);
  });

  it('searchComplete: a chain counts once the marks have reached it, not before (3.3)', () => {
    // Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
    const fog = pathGraph(6);
    const start = createGardenState({
      graph: fog,
      matching: unwrap(
        createMatching(fog, [
          [1, 2],
          [3, 4],
        ]),
      ),
      allowed: ['markRoot', 'markMoon'],
    });
    const walked = play(start, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
    ]);
    expect(isVictory(walked, { type: 'searchComplete' })).toBe(false);
    const found = play(walked, [{ type: 'markMoon', from: 4, to: 5 }]);
    expect(isVictory(found, { type: 'searchComplete' })).toBe(true);
  });

  it('searchComplete: with folding allowed, a conflict left unfolded is not the end (4.4)', () => {
    const searched = play(festival(['markRoot', 'markMoon', 'foldAt']), SEARCH);
    expect(isVictory(searched, { type: 'searchComplete' })).toBe(false);
  });

  it('searchExhausted: the search is over with no chain, and "Terminé" says so (3.6, 4.9)', () => {
    const searched = play(festival(['markRoot', 'markMoon', 'declareDone']), SEARCH);
    expect(isVictory(searched, { type: 'searchExhausted' })).toBe(false);
    const claimed = play(searched, [{ type: 'declareDone' }]);
    expect(isVictory(claimed, { type: 'searchExhausted' })).toBe(true);
    const early = play(festival(['markRoot', 'markMoon', 'declareDone']), [
      ...SEARCH.slice(0, 2),
      { type: 'declareDone' },
    ]);
    expect(isVictory(early, { type: 'searchExhausted' })).toBe(false);
  });
});
