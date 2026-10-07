import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bipartiteWithMatchingArb, graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { BRUTO_PROPERTY_TIMEOUT } from '../../../tests/support/timeouts';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { pathGraph } from '../generators/families';
import { createGraph } from '../graph/createGraph';
import type { Graph } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import type { Action } from '../rules/actions';
import { applyAction } from '../rules/applyAction';
import { createGardenState, type GardenState } from '../rules/state';
import { unwrap } from '../shared/result';
import { searchStatus, type SearchStatus } from './searchStatus';

/** Plays moves in order; a refusal here is a test bug. */
const play = (state: GardenState, actions: readonly Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

/** The status of the player's search in a garden state. */
const statusOf = (
  state: GardenState,
  roots: readonly number[] | null = null,
  foldAllowed = false,
): SearchStatus => searchStatus(state.layer, state.search, { roots, foldAllowed });

// Level 3.1 without fog: R–a=b–c=d–T as 0–1=2–3=4–5.
const fogPath = pathGraph(6);
const fog = createGardenState({
  graph: fogPath,
  matching: unwrap(
    createMatching(fogPath, [
      [1, 2],
      [3, 4],
    ]),
  ),
  allowed: ['markRoot', 'markMoon'],
});

// Level 4.1: R–a=b, triangle b–c=d–b, c–e. R a b c d e = 0 1 2 3 4 5.
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
  allowed: ['markRoot', 'markMoon', 'foldAt'],
});
/** The player's search of level 4.1 from R alone: R sun, a moon, b sun, c moon, d sun. */
const betrayed = play(festival, [
  { type: 'markRoot', vertex: 0 },
  { type: 'markMoon', from: 0, to: 1 },
  { type: 'markMoon', from: 2, to: 3 },
]);

describe('searchStatus: whether the search is over, and how', () => {
  it('before any mark, a sprout in the dark that may start a search keeps it open', () => {
    expect(statusOf(fog)).toBe('open');
    expect(statusOf(fog, [5])).toBe('open');
  });

  it('a garden with nobody allowed to start, or nobody in the dark, has nothing to search', () => {
    const lit = createGardenState({
      graph: pathGraph(2),
      matching: unwrap(createMatching(pathGraph(2), [[0, 1]])),
      allowed: [],
    });
    expect(statusOf(lit)).toBe('exhausted');
    expect(statusOf(fog, [1, 2])).toBe('exhausted');
  });

  it('a sun with a dark vine to an unmarked sprout with a lantern is still to explore', () => {
    expect(statusOf(play(fog, [{ type: 'markRoot', vertex: 0 }]), [0])).toBe('open');
  });

  it('a lonely sprout one look away from a sun is a chain, also once seen (level 3.1)', () => {
    const walked = play(fog, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
    ]);
    expect(statusOf(walked, [0])).toBe('chain');
    expect(statusOf(play(walked, [{ type: 'markMoon', from: 4, to: 5 }]), [0])).toBe('chain');
  });

  it('two suns of different trees touching is a chain (level 3.4)', () => {
    const twoTrees = play(fog, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markRoot', vertex: 5 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 5, to: 4 },
    ]);
    expect(statusOf(twoTrees)).toBe('chain');
  });

  it('the lie of level 4.1: from R alone, without folding, the search ends with no chain', () => {
    expect(statusOf(betrayed, [0], false)).toBe('exhausted');
  });

  it('with folding allowed, the same sun–sun vine means "fold it", not "finished"', () => {
    expect(statusOf(betrayed, [0], true)).toBe('conflict');
  });

  it('a lonely sprout that may still start its own search keeps the search open', () => {
    expect(statusOf(betrayed, null, false)).toBe('open');
  });

  it('after folding, the flower is a sun and its exit to e is a chain (level 4.4)', () => {
    const folded = play(betrayed, [{ type: 'foldAt', from: 4, to: 2 }]);
    expect(statusOf(folded, [0], true)).toBe('chain');
  });

  it('a moon reached twice closes nothing: the search just ends (level 3.3)', () => {
    // Two sprouts in the dark, 0 and 3, both next to the lit sprout 1 (1=2).
    const square = unwrap(
      createGraph(4, [
        [0, 1],
        [1, 2],
        [1, 3],
      ]),
    );
    const state = play(
      createGardenState({
        graph: square,
        matching: unwrap(createMatching(square, [[1, 2]])),
        allowed: ['markRoot', 'markMoon'],
      }),
      [
        { type: 'markRoot', vertex: 0 },
        { type: 'markRoot', vertex: 3 },
        { type: 'markMoon', from: 0, to: 1 },
      ],
    );
    expect(statusOf(state)).toBe('exhausted');
  });
});

/**
 * Plays a whole search with the player's own moves: every sprout in the dark becomes a root, then
 * suns look along their vines (folding where suns of one tree meet, if allowed) until the status
 * says the search is over. Returns the state where it stopped and that status.
 */
function searchToTheEnd(
  graph: Graph,
  matching: Matching,
  foldAllowed: boolean,
): { state: GardenState; status: SearchStatus } {
  let state = createGardenState({
    graph,
    matching,
    allowed: foldAllowed ? ['markRoot', 'markMoon', 'foldAt'] : ['markRoot', 'markMoon'],
  });
  const candidates = (): Action[] => [
    ...Array.from({ length: graph.n }, (_, vertex): Action => ({ type: 'markRoot', vertex })),
    ...graph.edges.flatMap(([u, v]): Action[] => [
      { type: 'markMoon', from: u, to: v },
      { type: 'markMoon', from: v, to: u },
    ]),
  ];
  for (;;) {
    const status = statusOf(state, null, foldAllowed);
    if (status === 'chain' || status === 'exhausted') return { state, status };
    const moves: Action[] =
      status === 'conflict'
        ? graph.edges.map(([u, v]): Action => ({ type: 'foldAt', from: u, to: v }))
        : candidates();
    // An open search always has a move that marks something new.
    const next = moves
      .map((move) => applyAction(state, move))
      .find((outcome) => outcome.ok && !outcome.events.some((e) => e.type === 'chainFound'));
    if (next === undefined || !next.ok) throw new Error(`a ${status} search with no move`);
    state = next.state;
  }
}

/** The chain the marks reach once the status says there is one. */
function chainOf(state: GardenState): readonly number[] {
  for (const [u, v] of state.graph.edges) {
    for (const [from, to] of [
      [u, v],
      [v, u],
    ] as const) {
      const outcome = applyAction(state, { type: 'markMoon', from, to });
      if (outcome.ok && outcome.state.chainSeen !== null) return outcome.state.chainSeen;
    }
  }
  throw new Error('the status says chain, but no look reaches one');
}

describe('searchStatus against Bruto', () => {
  it(
    'bees and flowers, every root marked: no chain means the most lanterns; a chain is augmenting',
    () => {
      fc.assert(
        fc.property(bipartiteWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
          const { state, status } = searchToTheEnd(graph, matching, false);
          if (status === 'exhausted') {
            const best = bruteForceMatching(graph);
            expect(best.status === 'complete' && size(best.matching)).toBe(size(matching));
          } else {
            expect(checkAugmentingPath(graph, matching, chainOf(state)).ok).toBe(true);
          }
        }),
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );

  it(
    'any garden, folding where suns meet: the search with flowers never lies',
    () => {
      fc.assert(
        fc.property(graphWithMatchingArb({ maxN: 10 }), ([graph, matching]) => {
          const { state, status } = searchToTheEnd(graph, matching, true);
          if (status === 'exhausted') {
            const best = bruteForceMatching(graph);
            expect(best.status === 'complete' && size(best.matching)).toBe(size(matching));
          } else {
            expect(checkAugmentingPath(graph, matching, chainOf(state)).ok).toBe(true);
          }
        }),
      );
    },
    BRUTO_PROPERTY_TIMEOUT,
  );
});
