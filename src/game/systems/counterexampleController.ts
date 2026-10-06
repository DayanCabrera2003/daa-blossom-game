import type { Action } from '@core/rules/actions';
import { applyAction } from '@core/rules/applyAction';
import type { GardenState } from '@core/rules/state';
import type { TraceEvent } from '@core/trace/events';
import type { Counterexample } from '@levels/counterexample';
import {
  chooseTool,
  initialPointer,
  pressEnd,
  pressMove,
  pressStart,
  type PointerState,
} from '../input/pointer';
import type { Point } from '../input/target';
import { hitTest } from '../input/HitTest';
import { availableTools, type ToolId } from '../input/tools';
import { triedChain } from '../input/triedChain';
import { current, push, redo, startHistory, undo, type History } from './history';
import type { Refusal } from './refusal';

/**
 * The screen of a notebook counterexample (plan 03, phase 6): a small garden the player touches
 * with the same input and the same core rules as a level, to see a false statement fail. Pure, like
 * the level controller, but simpler: there is no script, no victory and no hint, only moves, undo
 * and redo. A `mirrorDraw` garden takes no garden touches; drawing its reflection is plan 03,
 * phase 8.
 */

/** Everything the counterexample screen remembers: its garden's day, the pointer, the sprouts. */
export interface CounterexampleController {
  readonly counterexample: Counterexample;
  readonly history: History<GardenState>;
  readonly pointer: PointerState;
  readonly positions: readonly Point[];
}

/** What the player did on the counterexample screen. */
export type CounterexampleEvent =
  | { readonly kind: 'press' | 'move' | 'release'; readonly point: Point }
  | { readonly kind: 'tool'; readonly tool: ToolId }
  | { readonly kind: 'undo' | 'redo' };

/** What the screen has to show after an event: a refused move, or an accepted one to animate. */
export type CounterexampleEffect =
  | { readonly kind: 'rejected'; readonly reason: Refusal; readonly action: Action }
  | { readonly kind: 'animate'; readonly action: Action; readonly events: readonly TraceEvent[] };

/** The controller after an event, and what to show for it. */
export type CounterexampleStep = {
  controller: CounterexampleController;
  effects: CounterexampleEffect[];
};

/** The counterexample as it opens, holding the first tool its actions give. */
export function openCounterexample(counterexample: Counterexample): CounterexampleController {
  const [first = 'lanterns'] = availableTools(counterexample.start.allowed);
  return {
    counterexample,
    history: startHistory(counterexample.start),
    pointer: initialPointer(first),
    positions: counterexample.data.sprouts.map(({ x, y }) => ({ x, y })),
  };
}

/** The garden shown now. */
export const shownGarden = (controller: CounterexampleController): GardenState =>
  current(controller.history);

/** Tries a move with the core rules: refused, it is reported; accepted, it joins the day. */
function apply(controller: CounterexampleController, action: Action): CounterexampleStep {
  const outcome = applyAction(shownGarden(controller), action);
  if (!outcome.ok) {
    return { controller, effects: [{ kind: 'rejected', reason: outcome.reason, action }] };
  }
  return {
    controller: { ...controller, history: push(controller.history, outcome.state) },
    effects: [{ kind: 'animate', action, events: outcome.events }],
  };
}

/** Handles one event of the counterexample screen. */
export function handleCounterexample(
  controller: CounterexampleController,
  event: CounterexampleEvent,
): CounterexampleStep {
  const same = (next: Partial<CounterexampleController>): CounterexampleStep => ({
    controller: { ...controller, ...next },
    effects: [],
  });
  if (controller.counterexample.mode === 'mirrorDraw') return { controller, effects: [] };
  const state = shownGarden(controller);
  const { pointer, positions } = controller;
  switch (event.kind) {
    case 'press':
      return same({ pointer: pressStart(pointer, state, positions, event.point) });
    case 'move': {
      const moved = pressMove(pointer, state, positions, event.point);
      if (moved.rejection === null) return same({ pointer: moved.pointer });
      const tried = triedChain(pointer.chain, hitTest(state, positions, event.point));
      return {
        controller: { ...controller, pointer: moved.pointer },
        effects: [{ kind: 'rejected', reason: moved.rejection, action: tried }],
      };
    }
    case 'release': {
      const released = pressEnd(pointer, state, positions, event.point);
      const next = { ...controller, pointer: released.pointer };
      return released.action === null
        ? { controller: next, effects: [] }
        : apply(next, released.action);
    }
    case 'tool':
      return same({ pointer: chooseTool(pointer, event.tool) });
    case 'undo':
      return same({ history: undo(controller.history) });
    case 'redo':
      return same({ history: redo(controller.history) });
  }
}
