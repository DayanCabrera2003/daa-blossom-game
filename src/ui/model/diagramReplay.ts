import { edmonds } from '@core/edmonds/solve';
import { runRecipe } from '@core/recipe/run';
import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { RejectReason } from '@core/rules/reasons';
import type { GardenState } from '@core/rules/state';
import { autoSearch } from '@core/search/autoSearch';
import { err, ok, type Result } from '@core/shared/result';
import type { TraceEvent } from '@core/trace/events';
import { stateAt } from '@core/trace/replay';
import { demoStart } from '@levels/demoStart';
import { gardenAtPlay } from '@levels/playStart';
import type { DiagramGarden } from './diagramGarden';
import type { TraceSource } from './diagramSpec';
import { snapshotOf } from './gardenSnapshot';
import type { MiniMoment } from './miniGarden';

/**
 * The day a replay diagram of the Codex walks under its sun (plan 07, phase 4): one step per thing
 * that happens, dawn first. The day comes from the core, never from here: a run of Edmonds is
 * replayed with `stateAt`, one step per event (the looks along a vine change nothing on the garden
 * and go with no step of their own); the reference solution, the light's search and the mechanical
 * gardener's moves are played with `applyAction`, one step per move, with the events it answered.
 */

/** A moment of the day: the garden as it is then, and what has just happened (none at dawn). */
export interface ReplayStep {
  readonly moment: MiniMoment;
  readonly events: readonly TraceEvent[];
}

/** Why a day cannot be replayed: a garden with no solution, or a move the rules refused. */
export type ReplayError =
  | { readonly code: 'noSolution' }
  | { readonly code: 'refused'; readonly step: number; readonly reason: RejectReason };

/** A moment of a garden of the rules. */
const momentOf = (state: GardenState): MiniMoment => ({
  snapshot: snapshotOf(state),
  scarecrows: state.scarecrows,
  stones: state.stones,
});

/** Plays `moves` from `start`, one step per move; the first move refused stops it. */
function playDay(start: GardenState, moves: readonly Action[]): Result<ReplayStep[], ReplayError> {
  const steps: ReplayStep[] = [{ moment: momentOf(start), events: [] }];
  let state = start;
  for (const [step, move] of moves.entries()) {
    const outcome = applyAction(state, move);
    if (!outcome.ok) return err({ code: 'refused', step, reason: outcome.reason });
    state = outcome.state;
    steps.push({ moment: momentOf(state), events: outcome.events });
  }
  return ok(steps);
}

/** A run of Edmonds' algorithm from the garden's starting lanterns, one step per event shown. */
function edmondsDay(start: GardenState): ReplayStep[] {
  const { trace } = edmonds(start.graph, start.matching);
  const at = (k: number): MiniMoment => ({
    snapshot: stateAt(start.matching, trace, k),
    scarecrows: [],
    stones: [],
  });
  const steps: ReplayStep[] = [{ moment: at(0), events: [] }];
  trace.forEach((event, k) => {
    if (event.type !== 'scanEdge') steps.push({ moment: at(k + 1), events: [event] });
  });
  return steps;
}

/** The steps of the day `source` makes in `garden`. */
export function replaySteps(
  garden: DiagramGarden,
  source: TraceSource,
): Result<ReplayStep[], ReplayError> {
  const start = garden.start;
  switch (source) {
    case 'edmonds':
      return ok(edmondsDay(start));
    case 'solution':
      return garden.level === null
        ? err({ code: 'noSolution' })
        : playDay(gardenAtPlay(garden.level), garden.level.solution);
    case 'autoSearch': {
      // The light marks as the player would, so it plays where marking is allowed.
      return playDay(demoStart(start), autoSearch(start.layer, start.search, start.roots));
    }
    case 'recipe': {
      const from = demoStart(start);
      return playDay(from, runRecipe(from, { fold: true }));
    }
  }
}
