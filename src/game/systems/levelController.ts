import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { invariant } from '@core/shared/invariant';
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
import { triedChain } from '../input/triedChain';
import type { FlowEffect } from './flow';
import type { HintContent } from './hintContent';
import {
  act,
  askHint,
  garden,
  openSession,
  redoSession,
  respond,
  seekSession,
  stepNow,
  undoSession,
  type LevelSession,
  type ScriptInput,
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
  | { readonly kind: 'seek'; readonly fraction: number }
  /** An option of the question on screen (its index), or the number picked in a count. */
  | { readonly kind: 'answer'; readonly option: number }
  | { readonly kind: 'bet'; readonly value: number }
  /** A touch on the garden or on a sprout, for the steps that wait for one. */
  | { readonly kind: 'tapGarden' }
  | { readonly kind: 'tapSprout'; readonly vertex: VertexId }
  /** The mirror challenge: a vine put in or out of the drawn reflection, and the check of it. */
  | { readonly kind: 'drawToggle'; readonly u: VertexId; readonly v: VertexId }
  | { readonly kind: 'checkMirror' };

/**
 * What the scene has to show after an event: the answers to moves and hints, and the effects of the
 * script, except that the end of the script reaches the scene as the win, with its stars.
 */
export type Effect =
  | Exclude<FlowEffect, { readonly kind: 'finished' }>
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

/** The effects of the script as the scene sees them: its end is the win, with the stars it fixed. */
function shown(session: LevelSession, effects: readonly FlowEffect[]): Effect[] {
  return effects.map((effect): Effect => {
    if (effect.kind !== 'finished') return effect;
    invariant(session.won !== null, 'a finished script fixes the stars');
    return { kind: 'won', stars: session.won };
  });
}

/** A level screen as the level starts, holding the first tool it unlocks, and what its script opens with. */
export function openController(level: Level, now: number): Step {
  const [first = 'lanterns'] = availableTools(level.start.allowed);
  const { session, effects } = openSession(level, now);
  return {
    controller: {
      session,
      pointer: initialPointer(first),
      highlight: [],
      positions: level.data.sprouts.map(({ x, y }) => ({ x, y })),
    },
    effects: shown(session, effects),
  };
}

/** A level screen as the level starts, holding the first tool it unlocks. */
export const startController = (level: Level, now: number): Controller =>
  openController(level, now).controller;

/** Gives the script an input of the player; the controller keeps everything else. */
function tell(controller: Controller, input: ScriptInput, now: number): Step {
  const { session, effects } = respond(controller.session, input, now);
  return { controller: { ...controller, session }, effects: shown(session, effects) };
}

/** A move through the day (undo, redo, the sun): when the shown state changes, the sun moved. */
function travel(controller: Controller, session: LevelSession, now: number): Step {
  const moved = session.history.cursor !== controller.session.history.cursor;
  const next = { ...controller, session };
  return moved ? tell(next, { type: 'sunMoved' }, now) : { controller: next, effects: [] };
}

/**
 * Tries a move: refused, it is reported; accepted, it is animated, puts out hint glows, and may win
 * the play step, which moves the script on.
 */
function apply(controller: Controller, action: Action, now: number): Step {
  const { session, outcome, effects: flowEffects } = act(controller.session, action, now);
  if (!outcome.ok) {
    return {
      controller: { ...controller, session },
      effects: [{ kind: 'rejected', reason: outcome.reason, action }],
    };
  }
  const effects: Effect[] = [
    { kind: 'animate', action, events: outcome.events },
    ...shown(session, flowEffects),
  ];
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
    case 'press': {
      // Steps that wait for a touch take the press themselves: it is never a move.
      const step = stepNow(controller.session)?.step;
      if (step === 'separate') return tell(controller, { type: 'tap' }, now);
      if (step === 'explore') {
        const target = hitTest(state, positions, event.point);
        return target.kind === 'sprout'
          ? tell(controller, { type: 'tapSprout', vertex: target.vertex }, now)
          : same({});
      }
      return same({ pointer: pressStart(controller.pointer, state, positions, event.point) });
    }
    case 'move': {
      const moved = pressMove(controller.pointer, state, positions, event.point);
      if (moved.rejection === null) return same({ pointer: moved.pointer });
      const action = triedChain(controller.pointer.chain, hitTest(state, positions, event.point));
      return {
        controller: { ...controller, pointer: moved.pointer },
        effects: [{ kind: 'rejected', reason: moved.rejection, action }],
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
      return travel(controller, undoSession(controller.session), now);
    case 'redo':
      return travel(controller, redoSession(controller.session), now);
    case 'seek': {
      const steps = controller.session.history.states.length;
      const step = stepAtFraction(event.fraction, steps);
      return travel(controller, seekSession(controller.session, step), now);
    }
    case 'answer':
      return tell(controller, { type: 'answer', option: event.option }, now);
    case 'bet':
      return tell(controller, { type: 'bet', value: event.value }, now);
    case 'tapGarden':
      return tell(controller, { type: 'tap' }, now);
    case 'tapSprout':
      return tell(controller, { type: 'tapSprout', vertex: event.vertex }, now);
    case 'drawToggle':
    case 'checkMirror':
      // The mirror challenge is drawn and checked in plan 03, phase 8; until then they do nothing.
      return same({});
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
