import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import type { TraceEvent } from '@core/trace/events';
import type { Level } from '@levels/build';
import { hitTest } from '../input/HitTest';
import {
  chooseTool,
  initialPointer,
  pressEnd,
  pressMove,
  pressStart,
  type PointerState,
} from '../input/pointer';
import type { Point } from '../input/target';
import { availableTools, type ToolId } from '../input/tools';
import type { HintContent } from './hintContent';
import {
  act,
  askHint,
  garden,
  redoSession,
  seekSession,
  startSession,
  undoSession,
  type LevelSession,
} from './levelSession';
import type { Refusal } from './refusal';
import type { StarResult } from './stars';
import { stepAtFraction } from './sun';

/** Everything a level screen remembers: the session, the pointer, what glows, where sprouts sit. */
export interface Controller {
  readonly session: LevelSession;
  readonly pointer: PointerState;
  /** Sprouts glowing because of a hint; put out by the next accepted move. */
  readonly highlight: readonly VertexId[];
  readonly positions: readonly Point[];
}

/** What the player did on the level screen, as the scene reports it. */
export type UiEvent =
  | { readonly kind: 'press' | 'move' | 'release'; readonly point: Point }
  | { readonly kind: 'tool'; readonly tool: ToolId }
  | { readonly kind: 'undo' | 'redo' | 'hint' | 'done' }
  | { readonly kind: 'seek'; readonly fraction: number };

/** What the scene has to show after an event. */
export type Effect =
  | { readonly kind: 'rejected'; readonly reason: Refusal; readonly action: Action }
  | {
      readonly kind: 'animate';
      /** The move accepted, for the playtest log. */
      readonly action: Action;
      readonly events: readonly TraceEvent[];
    }
  | { readonly kind: 'hint'; readonly content: HintContent }
  | { readonly kind: 'won'; readonly stars: StarResult };

/** The controller after an event, and what the scene has to show for it. */
export type Step = { controller: Controller; effects: Effect[] };

/** A level screen as the level starts, holding the first tool it unlocks. */
export function startController(level: Level, now: number): Controller {
  const [first = 'lanterns'] = availableTools(level.start.allowed);
  return {
    session: startSession(level, now),
    pointer: initialPointer(first),
    highlight: [],
    positions: level.data.sprouts.map(({ x, y }) => ({ x, y })),
  };
}

/** Tries a move: refused, it is reported; accepted, it is animated, puts out hint glows, may win. */
function apply(controller: Controller, action: Action, now: number): Step {
  const before = controller.session.won;
  const { session, outcome } = act(controller.session, action, now);
  if (!outcome.ok) {
    return {
      controller: { ...controller, session },
      effects: [{ kind: 'rejected', reason: outcome.reason, action }],
    };
  }
  const effects: Effect[] = [{ kind: 'animate', action, events: outcome.events }];
  if (before === null && session.won !== null) effects.push({ kind: 'won', stars: session.won });
  return { controller: { ...controller, session, highlight: [] }, effects };
}

/** Handles one event of the level screen at time `now` (milliseconds). Pure. */
export function handle(controller: Controller, event: UiEvent, now: number): Step {
  const state = garden(controller.session);
  const { positions } = controller;
  const same = (next: Partial<Controller>): Step => ({
    controller: { ...controller, ...next },
    effects: [],
  });
  switch (event.kind) {
    case 'press':
      return same({ pointer: pressStart(controller.pointer, state, positions, event.point) });
    case 'move': {
      const moved = pressMove(controller.pointer, state, positions, event.point);
      if (moved.rejection === null) return same({ pointer: moved.pointer });
      const target = hitTest(state, positions, event.point);
      const tried = [
        ...(controller.pointer.chain ?? []),
        ...(target.kind === 'sprout' ? [target.vertex] : []),
      ];
      return {
        controller: { ...controller, pointer: moved.pointer },
        effects: [
          { kind: 'rejected', reason: moved.rejection, action: { type: 'chain', path: tried } },
        ],
      };
    }
    case 'release': {
      const released = pressEnd(controller.pointer, state, positions, event.point);
      const next = { ...controller, pointer: released.pointer };
      return released.action === null
        ? { controller: next, effects: [] }
        : apply(next, released.action, now);
    }
    case 'tool':
      return same({ pointer: chooseTool(controller.pointer, event.tool) });
    case 'undo':
      return same({ session: undoSession(controller.session) });
    case 'redo':
      return same({ session: redoSession(controller.session) });
    case 'seek': {
      const steps = controller.session.history.states.length;
      return same({
        session: seekSession(controller.session, stepAtFraction(event.fraction, steps)),
      });
    }
    case 'done':
      return apply(controller, { type: 'declareDone' }, now);
    case 'hint': {
      const opened = askHint(controller.session, now);
      if (opened === null) return same({});
      const shown: Step = {
        controller: { ...controller, session: opened.session, highlight: opened.hint.highlight },
        effects: [{ kind: 'hint', content: opened.hint }],
      };
      if (opened.hint.move === null) return shown;
      const made = apply(shown.controller, opened.hint.move, now);
      return {
        controller: { ...made.controller, highlight: opened.hint.highlight },
        effects: [...shown.effects, ...made.effects],
      };
    }
  }
}
