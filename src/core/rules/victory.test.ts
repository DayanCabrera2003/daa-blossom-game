import { describe, expect, it } from 'vitest';
import { cycleGraph, pathGraph } from '../generators/families';
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

  it('coverComplete: scarecrows guard every vine, however many, once presented (7.1)', () => {
    // Level 7.1: the five-cycle holds two lanterns, yet guarding its vines takes three scarecrows.
    const c5 = cycleGraph(5);
    const five = createGardenState({
      graph: c5,
      matching: unwrap(
        createMatching(c5, [
          [0, 1],
          [2, 3],
        ]),
      ),
      allowed: [],
    });
    const presented = (scarecrows: number[]) =>
      isVictory({ ...five, scarecrows, declaredDone: true }, { type: 'coverComplete' });
    expect(presented([0, 2, 4])).toBe(true);
    expect(presented([0, 1, 2, 3, 4])).toBe(true);
    expect(presented([0, 2])).toBe(false);
    expect(isVictory({ ...five, scarecrows: [0, 2, 4] }, { type: 'coverComplete' })).toBe(false);
    // The greenhouse proof does not close here: three scarecrows against two lanterns.
    expect(
      isVictory(
        { ...five, scarecrows: [0, 2, 4], declaredDone: true },
        { type: 'coverCertificate' },
      ),
    ).toBe(false);
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

// Level 7.4: the garden of 4.9 twice, R–a=b with the loop b–c=d–b, as 0..4 and 5..9.
const twiceGraph = unwrap(
  createGraph(10, [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [7, 9],
  ]),
);
const twice = createGardenState({
  graph: twiceGraph,
  matching: unwrap(
    createMatching(twiceGraph, [
      [1, 2],
      [3, 4],
      [6, 7],
      [8, 9],
    ]),
  ),
  allowed: ['markRoot', 'markMoon', 'foldAt', 'liftStone', 'dropStone', 'declareDone'],
});
/** The search of the half whose R is `r`, to its end: a moon, then the loop folded. */
const searchHalf = (r: number): Action[] => [
  { type: 'markRoot', vertex: r },
  { type: 'markMoon', from: r, to: r + 1 },
  { type: 'markMoon', from: r + 2, to: r + 3 },
  { type: 'foldAt', from: r + 4, to: r + 2 },
];
/** These stones lifted, then "Terminé". */
const lift = (...stones: number[]): Action[] => [
  ...stones.map((vertex): Action => ({ type: 'liftStone', vertex })),
  { type: 'declareDone' },
];

describe('the stones handed over by the search as a victory (7.4)', () => {
  const searched = play(twice, [...searchHalf(0), ...searchHalf(5)]);

  it('moonCertificate: the stones are exactly the moons of the search over, presented', () => {
    expect(isVictory(play(searched, lift(1, 6)), { type: 'moonCertificate' })).toBe(true);
    expect(isVictory(play(searched, lift(6, 1)), { type: 'moonCertificate' })).toBe(true);
    const unclaimed = play(searched, lift(1, 6).slice(0, 2));
    expect(isVictory(unclaimed, { type: 'moonCertificate' })).toBe(false);
  });

  it('other stones that also prove the lanterns are not the ones the search handed over', () => {
    // Lifting a alone also closes the count: {R}, {b, c, d} and the other half are odd.
    const alone = play(searched, lift(1));
    expect(isVictory(alone, { type: 'tutteBergeCertificate' })).toBe(true);
    expect(isVictory(alone, { type: 'moonCertificate' })).toBe(false);
  });

  it('needs the search over: with no marks, or half a search, no moons are handed over', () => {
    expect(isVictory(play(twice, lift(1, 6)), { type: 'moonCertificate' })).toBe(false);
    const half = play(twice, [...searchHalf(0), ...lift(1)]);
    expect(isVictory(half, { type: 'tutteBergeCertificate' })).toBe(true);
    expect(isVictory(half, { type: 'moonCertificate' })).toBe(false);
  });
});
