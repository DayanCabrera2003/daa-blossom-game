import { stonesFromForest } from '@core/certificates/fromForest';
import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { checkVertexCover, koenigCover } from '@core/certificates/vertexCover';
import { runPhase } from '@core/edmonds/phase';
import { isMaximum } from '@core/edmonds/fast/maximum';
import { neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { everyChain } from '@core/matching/everyChain';
import { isExposed, size } from '@core/matching/queries';
import { shortestChain } from '@core/matching/shortestChain';
import type { Action } from '@core/rules/actions';
import type { ChainRule } from '@core/rules/chainRule';
import { applyAction } from '@core/rules/applyAction';
import { sameGarden } from '@core/rules/sameGarden';
import type { GardenState } from '@core/rules/state';
import { isVictory, type VictoryCondition } from '@core/rules/victory';
import { lightStep } from '@core/rules/lightStep';
import { itemAt } from '@core/shared/itemAt';
import { bipartiteMatching } from '@core/search/bipartiteMatching';
import { searchStatus } from '@core/search/searchStatus';
import { createRecorder } from '@core/trace/recorder';

/** What the mentor needs to know about a level: where it starts, how it is solved, how it is won. */
export interface MentorGoal {
  readonly start: GardenState;
  readonly solution: readonly Action[];
  readonly victory: VictoryCondition;
}

/** The next step of the reference solution, if the garden is where some prefix of it leads. */
function onTheSolution(goal: MentorGoal, state: GardenState): Action | null {
  let replayed = goal.start;
  let next: Action | null = null;
  for (const step of goal.solution) {
    if (sameGarden(replayed, state)) next = step;
    const outcome = applyAction(replayed, step);
    if (!outcome.ok) break;
    replayed = outcome.state;
  }
  return next;
}

/** Whether the rules accept `action` now. */
const accepted = (state: GardenState, action: Action): boolean => applyAction(state, action).ok;

/** A chain that lights one more lantern, read from the trace of one phase of Edmonds. */
function chainToLight(state: GardenState): VertexId[] | null {
  const recorder = createRecorder();
  runPhase(state.graph, state.matching, recorder);
  const augment = recorder.events.find((event) => event.type === 'augment');
  return augment?.type === 'augment' ? [...augment.path] : null;
}

/**
 * The move itself, or in the fog the look it needs first: lanterns only move along vines in sight,
 * so a move refused for a hidden vine becomes the inspection of the sprout that shows it.
 */
function throughTheFog(state: GardenState, move: Action): Action {
  const outcome = applyAction(state, move);
  if (outcome.ok || outcome.reason.code !== 'vineHidden' || !state.allowed.has('inspect')) {
    return move;
  }
  return { type: 'inspect', vertex: outcome.reason.vertex };
}

/**
 * Lighting the most lanterns. Flowers are opened first (lanterns only move in the open garden).
 * With chains unlocked, the whole chain at once, its vines looked at first in the fog. Before that
 * (chapter 1), along a shortest chain: two neighbors in the dark are joined; otherwise its first
 * lantern is passed along, which leaves a chain two vines shorter behind, until a join finishes it.
 */
function lightMore(state: GardenState): Action | null {
  if (state.chains.rule === 'seen') return lightSeen(state);
  const flower = state.layer.nodes.find((node) => node.kind === 'blossom');
  if (flower?.kind === 'blossom') return { type: 'unfold', blossom: flower.id };
  if (state.allowed.has('chain') && state.chains.rule === 'fromBase') {
    return lightFromBase(state, state.chains);
  }
  if (state.allowed.has('chain')) {
    const chain = chainToLight(state);
    return chain === null ? null : throughTheFog(state, { type: 'chain', path: chain });
  }
  // Lanterns are passed along a shortest chain: any other one may be undone by the next found.
  const chain = shortestChain(state.graph, state.matching);
  if (chain === null) return null;
  if (chain.length === 2) return { type: 'join', u: itemAt(chain, 0), v: itemAt(chain, 1) };
  return { type: 'passLantern', from: itemAt(chain, 0), to: itemAt(chain, 1) };
}

/**
 * Lighting more where only the chain the marks reached moves lanterns (`seen`): the search first,
 * folding where two suns meet, until it sees a chain; then the flowers that chain crosses are
 * opened, outer ones first, and the very chain the light found is lit. Opening a flower keeps the
 * chain seen, so the search is never undone by the opening.
 */
function lightSeen(state: GardenState): Action | null {
  const seen = state.chainSeen;
  if (seen === null) return searchStep(state);
  for (const sprout of seen) {
    const node = itemAt(state.layer.nodes, itemAt(state.layer.nodeOf, sprout));
    if (node.kind === 'blossom') return { type: 'unfold', blossom: node.id };
  }
  return throughTheFog(state, { type: 'chain', path: [...seen] });
}

/**
 * Lighting more where the level's flower is closed (`fromBase`, 4.10): a chain the rule lets
 * through, if there is one; otherwise the stem is rotated to the base (a chain of gain 0 ending
 * there), which leaves the base in the dark so a chain can leave from it. Chains are tried in a
 * fixed order (`everyChain`), so the mentor always offers the same move in the same garden.
 */
function lightFromBase(
  state: GardenState,
  rule: Extract<ChainRule, { rule: 'fromBase' }>,
): Action | null {
  // Chains are judged in the clear: in the fog, the vine still hidden is looked at first.
  const clear: GardenState = { ...state, revealed: null };
  const chains = everyChain(state.graph, state.matching);
  const lights = chains.find(
    (path) =>
      isExposed(state.matching, itemAt(path, path.length - 1)) &&
      accepted(clear, { type: 'chain', path }),
  );
  if (lights !== undefined) return throughTheFog(state, { type: 'chain', path: lights });
  const stem = chains.find(
    (path) =>
      itemAt(path, path.length - 1) === rule.base && accepted(clear, { type: 'chain', path }),
  );
  if (stem === undefined) return null;
  const rotate: Action = state.allowed.has('rotateStem')
    ? { type: 'rotateStem', stem }
    : { type: 'chain', path: stem };
  return throughTheFog(state, rotate);
}

/** Moving placed objects towards `target`: take away extras first, then add what is missing. */
function placeTowards(
  placed: readonly VertexId[],
  target: readonly VertexId[],
  remove: (vertex: VertexId) => Action,
  add: (vertex: VertexId) => Action,
): Action | null {
  const extra = placed.find((v) => !target.includes(v));
  if (extra !== undefined) return remove(extra);
  const missing = target.find((v) => !placed.includes(v));
  return missing === undefined ? null : add(missing);
}

/**
 * The next step of the light that searches by itself (the flower levels): advancing it, or, where
 * it stops, folding the loop it met or inspecting the sun it waits for in the fog (`lightStep`).
 * Null once it has seen a chain or has nothing left to look at.
 */
function lightOn(state: GardenState): Action | null {
  const step = lightStep(state);
  switch (step.kind) {
    case 'move':
      return { type: 'stepLight' };
    case 'flower':
      return { type: 'foldAt', from: step.from, to: step.to };
    case 'fog':
      return { type: 'inspect', vertex: step.vertex };
    default:
      return null;
  }
}

/**
 * The next mark of a search that looks for a chain: roots first (only those the level allows, which
 * `markRoot` checks), then looks from suns, folding when suns meet. In the fog only suns are
 * inspected, since only a sun looks along its vines: no drop of water is spent on anyone else.
 * Where the light searches by itself, the light is moved on instead (`lightOn`).
 */
function searchStep(state: GardenState): Action | null {
  if (state.allowed.has('stepLight')) return lightOn(state);
  const sprouts = [...Array(state.graph.n).keys()];
  const root = sprouts.find((v) => accepted(state, { type: 'markRoot', vertex: v }));
  if (root !== undefined) return { type: 'markRoot', vertex: root };
  const isSun = (v: VertexId): boolean =>
    state.search?.label[itemAt(state.layer.nodeOf, v)] === 'outer';
  for (const from of sprouts.filter(isSun)) {
    for (const to of neighbors(state.graph, from)) {
      const look: Action = { type: 'markMoon', from, to };
      const outcome = applyAction(state, look);
      if (outcome.ok) return look;
      if (outcome.reason.code === 'sunMeetsSun' && state.allowed.has('foldAt')) {
        return { type: 'foldAt', from, to };
      }
      if (outcome.reason.code === 'vineHidden' && state.allowed.has('inspect')) {
        return { type: 'inspect', vertex: from };
      }
    }
  }
  return null;
}

/**
 * The next step towards a search over without a chain, and "Terminé" (3.6, 4.9). If the marks can
 * still reach a chain, the lanterns are not the most yet (a lantern put out, say): it is lit first,
 * which wipes the marks, and the search starts again on the new lanterns.
 */
function toTheEndOfTheSearch(state: GardenState): Action | null {
  const status = searchStatus(state.layer, state.search, {
    roots: state.roots,
    foldAllowed: state.allowed.has('foldAt'),
  });
  if (status === 'exhausted') return { type: 'declareDone' };
  return status === 'chain' ? lightMore(state) : searchStep(state);
}

/**
 * The next step towards the stones handed over by the search (7.4): the search to its end, which
 * lights a chain first if one is within reach; then exactly its moons lifted, and "Terminé".
 */
function toTheMoons(state: GardenState): Action | null {
  const status = searchStatus(state.layer, state.search, {
    roots: state.roots,
    foldAllowed: state.allowed.has('foldAt'),
  });
  if (status === 'chain') return lightMore(state);
  if (status !== 'exhausted' || state.search === null) return searchStep(state);
  const moons = stonesFromForest(state.layer, state.search);
  return (
    placeTowards(
      state.stones,
      moons,
      (vertex) => ({ type: 'dropStone', vertex }),
      (vertex) => ({ type: 'liftStone', vertex }),
    ) ?? { type: 'declareDone' }
  );
}

/**
 * The next step towards scarecrows on every vine, however many (7.1): the sprout that guards the
 * most vines still unguarded (the first such sprout on a tie), then "Terminé".
 */
function guardTheRest(state: GardenState): Action {
  const guarded = new Set(state.scarecrows);
  const open = state.graph.edges.filter(([u, v]) => !guarded.has(u) && !guarded.has(v));
  if (open.length === 0) return { type: 'declareDone' };
  const reach = new Array<number>(state.graph.n).fill(0);
  for (const [u, v] of open) {
    reach[u] = itemAt(reach, u) + 1;
    reach[v] = itemAt(reach, v) + 1;
  }
  const best = reach.indexOf(Math.max(...reach));
  return { type: 'placeScarecrow', vertex: best };
}

/**
 * The step the mentor takes for the player at hint grade 3 (GDD §5.3). It is always a move the
 * rules accept, the level's chain rule among them, and that brings the level closer to its victory,
 * or null once the level is won:
 * on the reference solution, its next step; otherwise a step computed by the core for the
 * level's victory (a search for `chainFound` and `searchComplete`, a search to its end and then
 * "Terminé" for `searchExhausted`; the most lanterns, then "Terminé" or the right stones or
 * scarecrows, for the rest).
 */
export function nextMove(goal: MentorGoal, state: GardenState): Action | null {
  if (isVictory(state, goal.victory)) return null;
  const scripted = onTheSolution(goal, state);
  if (scripted !== null) return scripted;
  // A computed step is only offered if the rules take it now (e.g. no folding before 4.4).
  const computed = computedStep(goal, state);
  return computed !== null && accepted(state, computed) ? computed : null;
}

/** The step for the level's victory when the garden is off the reference solution. */
function computedStep(goal: MentorGoal, state: GardenState): Action | null {
  switch (goal.victory.type) {
    case 'chainFound':
    case 'searchComplete':
      return searchStep(state);
    case 'searchExhausted':
      return toTheEndOfTheSearch(state);
    default:
      break;
  }

  // Guarding every vine, however many scarecrows it takes, has nothing to do with the lanterns.
  if (goal.victory.type === 'coverComplete') return guardTheRest(state);
  if (goal.victory.type === 'moonCertificate') return toTheMoons(state);

  if (!isMaximum(state.graph, state.matching)) return lightMore(state);

  switch (goal.victory.type) {
    case 'tutteBergeCertificate': {
      if (checkTutteBerge(state.graph, state.matching, state.stones).ok)
        return { type: 'declareDone' };
      const outcome = runPhase(state.graph, state.matching);
      const target =
        outcome.kind === 'maximum' ? stonesFromForest(outcome.layer, outcome.forest) : [];
      return placeTowards(
        state.stones,
        target,
        (vertex) => ({ type: 'dropStone', vertex }),
        (vertex) => ({ type: 'liftStone', vertex }),
      );
    }
    case 'coverCertificate': {
      const covers = checkVertexCover(state.graph, state.scarecrows).ok;
      if (covers && state.scarecrows.length === size(state.matching))
        return { type: 'declareDone' };
      const run = bipartiteMatching(state.graph, state.matching);
      const target = run.ok ? koenigCover(state.graph, run.value.forest) : [];
      return placeTowards(
        state.scarecrows,
        target,
        (vertex) => ({ type: 'removeScarecrow', vertex }),
        (vertex) => ({ type: 'placeScarecrow', vertex }),
      );
    }
    default:
      return { type: 'declareDone' };
  }
}
