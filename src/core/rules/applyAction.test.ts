import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphWithMatchingArb } from '../../../tests/support/arbitraries';
import { expectForestInvariants } from '../../../tests/support/forestInvariants';
import { findOddCycle } from '../blossom/detect';
import { baseVertex } from '../blossom/hierarchy';
import type { GardenNode } from '../blossom/types';
import { bruteForceMatching } from '../bruteforce/maximumMatching';
import { createGraph } from '../graph/createGraph';
import { neighbors } from '../graph/queries';
import type { VertexId } from '../graph/types';
import { createMatching } from '../matching/createMatching';
import { checkAugmentingPath } from '../matching/paths';
import { isExposed, size } from '../matching/queries';
import { validateMate } from '../matching/validate';
import { unwrap } from '../shared/result';
import { createRng } from '../shared/rng';
import { bipartiteSearch } from '../search/bipartiteSearch';
import type { Action, ActionType } from './actions';
import { applyAction } from './applyAction';
import { UNLOCKED_AT } from './permissions';
import { createGardenState, type GardenState } from './state';
import { isVictory } from './victory';

const EVERY_ACTION = Object.keys(UNLOCKED_AT) as ActionType[];

/** Applies actions in order, failing the test if any is refused. */
const play = (state: GardenState, actions: Action[]): GardenState =>
  actions.reduce((current, action) => {
    const outcome = applyAction(current, action);
    if (!outcome.ok) throw new Error(`${action.type} refused: ${outcome.reason.code}`);
    return outcome.state;
  }, state);

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
  allowed: EVERY_ACTION,
});

describe('applying an action', () => {
  it('refuses an action the level has not unlocked', () => {
    const prologue = { ...festival, allowed: new Set<ActionType>(['join', 'split']) };
    expect(applyAction(prologue, { type: 'markRoot', vertex: 0 })).toEqual({
      ok: false,
      reason: { code: 'actionLocked', action: 'markRoot' },
    });
  });

  it('plays the festival from the betrayal to the third lantern (levels 4.1 to 4.5)', () => {
    const finished = play(festival, [
      { type: 'markRoot', vertex: 0 },
      { type: 'markMoon', from: 0, to: 1 },
      { type: 'markMoon', from: 2, to: 3 },
      { type: 'foldAt', from: 4, to: 2 },
      { type: 'markMoon', from: 3, to: 5 },
      { type: 'unfold', blossom: 0 },
      { type: 'chain', path: [0, 1, 2, 4, 3, 5] },
    ]);
    expect(size(finished.matching)).toBe(3);
    expect(finished.layer.nodes.length).toBe(6);
  });

  it('every action naming sprouts refuses one outside the garden', () => {
    const outside: Action[] = [
      { type: 'join', u: 0, v: 9 },
      { type: 'split', u: 9, v: 0 },
      { type: 'passLantern', from: 9, to: 0 },
      { type: 'chain', path: [0, 9] },
      { type: 'rotateStem', stem: [9] },
      { type: 'inspect', vertex: 9 },
      { type: 'markRoot', vertex: 9 },
      { type: 'markMoon', from: 0, to: 9 },
      { type: 'foldAt', from: 9, to: 0 },
      { type: 'fold', loop: [0, 1, 9] },
      { type: 'placeScarecrow', vertex: 9 },
      { type: 'liftStone', vertex: 9 },
    ];
    for (const action of outside) {
      expect(applyAction(festival, action)).toEqual({
        ok: false,
        reason: { code: 'vertexOutOfRange', vertex: 9 },
      });
    }
  });

  it('a sprout already marked does not start a second search', () => {
    const rooted = play(festival, [{ type: 'markRoot', vertex: 0 }]);
    expect(applyAction(rooted, { type: 'markRoot', vertex: 0 })).toEqual({
      ok: false,
      reason: { code: 'alreadyMarked', vertex: 0 },
    });
  });

  it('"Terminé" is a claim about this very moment: any other accepted move withdraws it', () => {
    const claimed = play(festival, [{ type: 'declareDone' }]);
    expect(claimed.declaredDone).toBe(true);
    expect(play(claimed, [{ type: 'declareDone' }]).declaredDone).toBe(true);
    expect(play(claimed, [{ type: 'placeScarecrow', vertex: 2 }]).declaredDone).toBe(false);
    expect(play(claimed, [{ type: 'split', u: 1, v: 2 }]).declaredDone).toBe(false);
    // A refused move changes nothing, so the claim stands.
    expect(applyAction(claimed, { type: 'join', u: 0, v: 2 }).ok).toBe(false);
  });

  it('level 4.9: a wrong "Terminé", then the right lanterns, still needs a new "Terminé"', () => {
    const closed = unwrap(
      createGraph(5, [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [2, 4],
      ]),
    );
    const start = createGardenState({
      graph: closed,
      matching: unwrap(createMatching(closed, [[1, 2]])),
      allowed: EVERY_ACTION,
    });
    const wrong = play(start, [{ type: 'declareDone' }]);
    expect(isVictory(wrong, { type: 'maximum' })).toBe(false);
    const fixed = play(wrong, [{ type: 'join', u: 3, v: 4 }]);
    expect(isVictory(fixed, { type: 'maximum' })).toBe(false);
    expect(isVictory(play(fixed, [{ type: 'declareDone' }]), { type: 'maximum' })).toBe(true);
  });

  it('never modifies the garden it is given', () => {
    const before = structuredClone(festival);
    applyAction(festival, { type: 'markRoot', vertex: 0 });
    applyAction(festival, { type: 'chain', path: [0, 1, 2] });
    expect(festival).toEqual(before);
  });

  it('property: any sequence of accepted moves keeps a valid garden', () => {
    // Moves are picked relative to the current garden so that every kind gets accepted often
    // enough: suns to look from, sun neighbors to fold at, real odd loops, real flowers.
    const step = fc.tuple(
      fc.nat({ max: EVERY_ACTION.length - 1 }),
      fc.nat(),
      fc.nat(),
      fc.array(fc.nat(), { maxLength: 7 }),
    );
    fc.assert(
      fc.property(
        graphWithMatchingArb({ maxN: 9 }),
        fc.boolean(),
        fc.array(step, { maxLength: 40 }),
        ([graph, matching], fog, steps) => {
          if (graph.n === 0) return;
          let state = createGardenState({ graph, matching, fog, allowed: EVERY_ACTION });
          for (const [kind, a, b, walk] of steps) {
            const pick = <T>(items: readonly T[], seed: number, fallback: T): T =>
              items.length > 0 ? (items[seed % items.length] as T) : fallback;
            const isSun = (v: VertexId) =>
              state.search?.label[state.layer.nodeOf[v] as VertexId] === 'outer';
            const sprouts = [...Array(graph.n).keys()];
            const u = pick(a % 2 === 0 ? sprouts.filter(isSun) : [], a >> 1, a % graph.n);
            const around = neighbors(graph, u);
            const v = pick(b % 2 === 0 ? around.filter(isSun) : around, b >> 1, pick(around, b, u));
            const path = [u];
            for (const choice of walk) {
              const options = neighbors(graph, path[path.length - 1] as VertexId);
              if (options.length === 0) break;
              path.push(options[choice % options.length] as VertexId);
            }
            const conflict = bipartiteSearch(state.layer.graph, state.layer.matching);
            const loop = conflict.ok
              ? path
              : findOddCycle(conflict.error.forest, conflict.error.from, conflict.error.to).map(
                  (id) => baseVertex(state.layer.nodes[id] as GardenNode),
                );
            const flowers = state.layer.nodes.flatMap((node) =>
              node.kind === 'blossom' ? [node.id] : [],
            );
            const type = EVERY_ACTION[kind] as ActionType;
            const action = {
              type,
              u,
              v,
              from: u,
              to: v,
              vertex: u,
              path,
              stem: path,
              loop,
              blossom: pick(flowers, b, 0),
            } as Action;

            const outcome = applyAction(state, action);
            if (!outcome.ok) continue;
            const next = outcome.state;
            expect(validateMate(graph, next.matching.mate).ok).toBe(true);
            if (next.search !== null) {
              expectForestInvariants(next.layer.graph, next.layer.matching, next.search);
            }
            if (type === 'chain') {
              const gain = size(next.matching) - size(state.matching);
              const end = path[path.length - 1] as VertexId;
              expect(gain).toBe(path.length > 1 && isExposed(state.matching, end) ? 1 : 0);
            }
            if (type === 'rotateStem' || type === 'passLantern') {
              expect(size(next.matching)).toBe(size(state.matching));
            }
            state = next;
          }
        },
      ),
    );
  });

  it('property: searching by the rules, in any order, is as right as the recipe', () => {
    // The player marks every sprout in the dark, then keeps looking from suns in a random order,
    // folding wherever two suns of one tree meet. Either a chain shows up, and it is real, or the
    // player runs out of moves, and then no chain exists: the matching is maximum (Bruto agrees).
    fc.assert(
      fc.property(graphWithMatchingArb({ maxN: 9 }), fc.integer(), ([graph, matching], seed) => {
        const rng = createRng(seed);
        let state = createGardenState({ graph, matching, allowed: EVERY_ACTION });
        for (let v = 0; v < graph.n; v++) {
          if (isExposed(matching, v)) state = play(state, [{ type: 'markRoot', vertex: v }]);
        }
        for (;;) {
          const looks = graph.edges.flatMap(([a, b]) => [
            [a, b],
            [b, a],
          ]);
          let progressed = false;
          for (const [from, to] of rng.shuffle(looks) as [VertexId, VertexId][]) {
            const outcome = applyAction(state, { type: 'markMoon', from, to });
            if (outcome.ok && outcome.state.chainSeen !== null) {
              expect(checkAugmentingPath(graph, matching, outcome.state.chainSeen).ok).toBe(true);
              return;
            }
            if (outcome.ok) {
              state = outcome.state;
              progressed = true;
              break;
            }
            if (outcome.reason.code === 'sunMeetsSun') {
              state = play(state, [{ type: 'foldAt', from, to }]);
              if (state.search !== null) {
                expectForestInvariants(state.layer.graph, state.layer.matching, state.search);
              }
              progressed = true;
              break;
            }
          }
          if (!progressed) {
            const best = bruteForceMatching(graph);
            if (best.status === 'complete') expect(size(matching)).toBe(size(best.matching));
            return;
          }
        }
      }),
    );
  });
});
