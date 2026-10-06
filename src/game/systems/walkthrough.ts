import type { Edge } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { itemAt } from '@core/shared/itemAt';
import type { Level, WalkthroughEntry } from '@levels/build';
import { isFlowInput, type FlowInput } from '@levels/flowInput';
import { gesturesFor, vinePoint, type Gesture } from '../input/gestures';
import { isFinished } from './flow';
import {
  handle,
  openController,
  type Controller,
  type Effect,
  type UiEvent,
} from './levelController';
import { garden } from './levelSession';
import type { Refusal } from './refusal';

/**
 * Plays a level's reference walkthrough through the level controller, with no scene: every move as
 * the touches and drags a player would make where the sprouts really are, every script input as
 * the interface event the scene would send; a reflection of the mirror challenge as touches on its
 * vines. A level whose walkthrough does not finish its script
 * never reaches the browser (plan 03, §0): the playability test and `check-levels` both run this.
 */

/** Why a walkthrough does not play through; `entry` is its index in the walkthrough. */
export type WalkthroughProblem =
  /** A move was refused (by the rules, or because the script was not playing). */
  | { readonly code: 'moveRefused'; readonly entry: number; readonly reason: Refusal }
  /** No gesture on the canvas makes this move (a sprout hides a vine, for instance). */
  | { readonly code: 'gestureImpossible'; readonly entry: number; readonly message: string }
  /** The gestures made a different move from the one written. */
  | { readonly code: 'gestureMismatch'; readonly entry: number }
  /** An answer, bet or touch that the step on screen did not wait for. */
  | { readonly code: 'inputIgnored'; readonly entry: number }
  /** Every entry played, and the script still waits at this step. */
  | { readonly code: 'unfinished'; readonly step: number };

/** How a walkthrough went: the controller at its end, every effect shown, and the first problem. */
export interface WalkthroughResult {
  readonly controller: Controller;
  readonly effects: readonly Effect[];
  readonly problem: WalkthroughProblem | null;
}

/** The interface events of one gesture: a tool, "Terminé", or a press dragged through points. */
function gestureEvents(gesture: Gesture): UiEvent[] {
  if (gesture.kind === 'tool') return [{ kind: 'tool', tool: gesture.tool }];
  if (gesture.kind === 'done') return [{ kind: 'done' }];
  const { points } = gesture;
  return [
    { kind: 'press', point: itemAt(points, 0) },
    ...points.slice(1).map((point): UiEvent => ({ kind: 'move', point })),
    { kind: 'release', point: itemAt(points, points.length - 1) },
  ];
}

/**
 * The interface events that give the script an input; a drawn reflection is touched where its vines
 * really are instead (`drawEvents`).
 */
function inputEvents(input: Exclude<FlowInput, { readonly type: 'drawMirror' }>): UiEvent[] {
  switch (input.type) {
    case 'answer':
      return [{ kind: 'answer', option: input.option }];
    case 'bet':
      return [{ kind: 'bet', value: input.value }];
    case 'seekSun':
      return [{ kind: 'seek', fraction: input.fraction }];
    case 'tapGarden':
      return [{ kind: 'tapGarden' }];
    case 'tapSprout':
      return [{ kind: 'tapSprout', vertex: input.vertex }];
    case 'checkMirror':
      return [{ kind: 'checkMirror' }];
  }
}

/** Inputs that always move the script on when it waits for them; the rest may go unnoticed. */
const ANSWERED: ReadonlySet<FlowInput['type']> = new Set([
  'answer',
  'bet',
  'tapGarden',
  'tapSprout',
]);

/**
 * A move written so that equal moves read the same: a vine touched from either end (joining,
 * splitting, folding at it) is the same vine, so its ends are put in order.
 */
function moveKey(action: Action): string {
  switch (action.type) {
    case 'join':
    case 'split':
      return JSON.stringify({
        ...action,
        u: Math.min(action.u, action.v),
        v: Math.max(action.u, action.v),
      });
    case 'foldAt':
      return JSON.stringify({
        ...action,
        from: Math.min(action.from, action.to),
        to: Math.max(action.from, action.to),
      });
    default:
      return JSON.stringify(action);
  }
}

/** Feeds events to the controller in order, collecting their effects. */
function feed(controller: Controller, events: readonly UiEvent[], now: number) {
  let current = controller;
  const effects: Effect[] = [];
  for (const event of events) {
    const step = handle(current, event, now);
    current = step.controller;
    effects.push(...step.effects);
  }
  return { controller: current, effects };
}

/** The events that perform a move in the garden as it is now, or why there are none. */
function moveEvents(controller: Controller, action: Action): UiEvent[] | string {
  try {
    const gestures = gesturesFor(garden(controller.session), controller.positions, action);
    return gestures.flatMap(gestureEvents);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * The touches that draw a reflection in the mirror challenge, one on each of its vines as the
 * garden shows them now, or why some vine cannot be touched.
 */
function drawEvents(controller: Controller, vines: readonly Edge[]): UiEvent[] | string {
  try {
    const state = garden(controller.session);
    return vines.flatMap(([u, v]): UiEvent[] => {
      const point = vinePoint(state, controller.positions, u, v);
      return [
        { kind: 'press', point },
        { kind: 'release', point },
      ];
    });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Plays a drawn reflection; a touch the challenge refuses is a refused move. */
function playDrawing(
  controller: Controller,
  vines: readonly Edge[],
  index: number,
  now: number,
): { controller: Controller; effects: Effect[]; problem: WalkthroughProblem | null } {
  const events = drawEvents(controller, vines);
  if (typeof events === 'string') {
    return {
      controller,
      effects: [],
      problem: { code: 'gestureImpossible', entry: index, message: events },
    };
  }
  const played = feed(controller, events, now);
  const refused = played.effects.find((effect) => effect.kind === 'drawRefused');
  return {
    ...played,
    problem:
      refused === undefined ? null : { code: 'moveRefused', entry: index, reason: refused.reason },
  };
}

/** Plays one entry; returns where it leaves the controller, or the problem it ran into. */
function playEntry(
  controller: Controller,
  entry: WalkthroughEntry,
  index: number,
  now: number,
): { controller: Controller; effects: Effect[]; problem: WalkthroughProblem | null } {
  if (isFlowInput(entry)) {
    if (entry.type === 'drawMirror') return playDrawing(controller, entry.lanterns, index, now);
    const played = feed(controller, inputEvents(entry), now);
    const ignored = ANSWERED.has(entry.type) && played.effects.length === 0;
    return { ...played, problem: ignored ? { code: 'inputIgnored', entry: index } : null };
  }
  const events = moveEvents(controller, entry);
  if (typeof events === 'string') {
    return {
      controller,
      effects: [],
      problem: { code: 'gestureImpossible', entry: index, message: events },
    };
  }
  const played = feed(controller, events, now);
  const refused = played.effects.find((effect) => effect.kind === 'rejected');
  if (refused !== undefined) {
    return { ...played, problem: { code: 'moveRefused', entry: index, reason: refused.reason } };
  }
  // The gestures must make exactly the move written, once.
  const made = played.effects.flatMap((effect) =>
    effect.kind === 'animate' ? [effect.action] : [],
  );
  const [only] = made;
  const matches = made.length === 1 && only !== undefined && moveKey(only) === moveKey(entry);
  return { ...played, problem: matches ? null : { code: 'gestureMismatch', entry: index } };
}

/** Plays the level's whole walkthrough from its start, at time `now`; stops at the first problem. */
export function playWalkthrough(level: Level, now = 0): WalkthroughResult {
  const opened = openController(level, now);
  let controller = opened.controller;
  const effects: Effect[] = [...opened.effects];
  for (const [index, entry] of level.walkthrough.entries()) {
    const played = playEntry(controller, entry, index, now);
    controller = played.controller;
    effects.push(...played.effects);
    if (played.problem !== null) return { controller, effects, problem: played.problem };
  }
  const { flow } = controller.session;
  const problem: WalkthroughProblem | null = isFinished(flow)
    ? null
    : { code: 'unfinished', step: flow.index };
  return { controller, effects, problem };
}
