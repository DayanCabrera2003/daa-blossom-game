import { stonesFromForest } from '@core/certificates/fromForest';
import { checkTutteBerge } from '@core/certificates/tutteBerge';
import { checkVertexCover, koenigCover } from '@core/certificates/vertexCover';
import { runPhase } from '@core/edmonds/phase';
import { isMaximum } from '@core/edmonds/fast/maximum';
import { neighbors } from '@core/graph/queries';
import type { VertexId } from '@core/graph/types';
import { isExposed, size } from '@core/matching/queries';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import { isVictory, type VictoryCondition } from '@core/rules/victory';
import { bipartiteMatching } from '@core/search/bipartiteMatching';
import { createRecorder } from '@core/trace/recorder';
import { itemAt } from '@core/shared/itemAt';

/** What the mentor needs to know about a level: where it starts, how it is solved, how it is won. */
export interface MentorGoal {
  readonly start: GardenState;
  readonly solution: readonly Action[];
  readonly victory: VictoryCondition;
}

/** The parts of a garden the player changes; water spent is left out on purpose. */
const fingerprint = (state: GardenState): string =>
  JSON.stringify([
    state.matching.mate,
    state.layer.nodes,
    state.search,
    state.revealed,
    state.scarecrows,
    state.stones,
    state.chainSeen,
    state.declaredDone,
  ]);

/** The next step of the reference solution, if the garden is where some prefix of it leads. */
function onTheSolution(goal: MentorGoal, state: GardenState): Action | null {
  const target = fingerprint(state);
  let replayed = goal.start;
  let next: Action | null = null;
  for (const step of goal.solution) {
    if (fingerprint(replayed) === target) next = step;
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
 * Lighting the most lanterns. Flowers are opened first (lanterns only move in the open garden).
 * With chains unlocked, the whole chain at once. Before that (chapter 1), two neighbors in the dark
 * are joined if there are any; otherwise the first lantern of a chain is passed along, which leaves
 * a shorter chain behind, until a join finishes it.
 */
function lightMore(state: GardenState): Action | null {
  const flower = state.layer.nodes.find((node) => node.kind === 'blossom');
  if (flower?.kind === 'blossom') return { type: 'unfold', blossom: flower.id };
  const chain = chainToLight(state);
  if (chain === null) return null;
  if (state.allowed.has('chain')) return { type: 'chain', path: chain };
  const free = state.graph.edges.find(
    ([u, v]) => isExposed(state.matching, u) && isExposed(state.matching, v),
  );
  if (free !== undefined) return { type: 'join', u: free[0], v: free[1] };
  return { type: 'passLantern', from: itemAt(chain, 0), to: itemAt(chain, 1) };
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

/** The next mark of a search that looks for a chain: roots first, then looks from suns, folding when suns meet. */
function searchStep(state: GardenState): Action | null {
  const sprouts = [...Array(state.graph.n).keys()];
  const root = sprouts.find((v) => accepted(state, { type: 'markRoot', vertex: v }));
  if (root !== undefined) return { type: 'markRoot', vertex: root };
  for (const from of sprouts) {
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
 * The step the mentor takes for the player at hint grade 3 (GDD §5.3). It is always a move the
 * rules accept and that brings the level closer to its victory, or null once the level is won:
 * on the reference solution, its next step; otherwise a step computed by the core for the
 * level's victory (a search for `chainFound`; the most lanterns, then "Terminé" or the right
 * stones or scarecrows, for the rest).
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
  if (goal.victory.type === 'chainFound') return searchStep(state);

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
