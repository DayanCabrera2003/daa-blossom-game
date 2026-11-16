import { idOf, toEdges, type LabelError, type Labels } from '@core/graph/labels';
import type { VertexId } from '@core/graph/types';
import type { Action } from '@core/rules/actions';
import { itemAt } from '@core/shared/itemAt';
import { err, ok, type Result } from '@core/shared/result';
import type { LevelAction } from './fields';
import type { FlowStep, LevelStep } from './flow';
import { isFlowInput, type FlowInput, type LevelFlowInput } from './flowInput';

/*
 * Turns what a level file writes with sprout names into the same thing with sprout ids, as the
 * core works with ids only. An unknown name is reported, never guessed.
 */

/** The id of a named sprout, or why there is none. */
function named(labels: Labels, name: string): Result<VertexId, LabelError> {
  const vertex = idOf(labels, name);
  return vertex === undefined ? err({ code: 'unknownName', name }) : ok(vertex);
}

/** The ids of a list of named sprouts, stopping at the first unknown name. */
export function toSprouts(
  labels: Labels,
  names: readonly string[],
): Result<VertexId[], LabelError> {
  const vertices: VertexId[] = [];
  for (const name of names) {
    const vertex = named(labels, name);
    if (!vertex.ok) return vertex;
    vertices.push(vertex.value);
  }
  return ok(vertices);
}

/** A hint as a level file writes it: its line and the names of the sprouts that glow with it. */
interface NamedHint {
  readonly line: string;
  readonly highlight: readonly string[];
}

/** Hints with the ids of the sprouts they light up, stopping at the first unknown name. */
export function toHints(
  labels: Labels,
  hints: readonly NamedHint[],
): Result<{ line: string; highlight: VertexId[] }[], LabelError> {
  const built: { line: string; highlight: VertexId[] }[] = [];
  for (const { line, highlight } of hints) {
    const sprouts = toSprouts(labels, highlight);
    if (!sprouts.ok) return sprouts;
    built.push({ line, highlight: sprouts.value });
  }
  return ok(built);
}

const SPROUT_FIELDS = ['u', 'v', 'from', 'to', 'vertex'] as const;
const PATH_FIELDS = ['path', 'stem', 'loop'] as const;

/**
 * Translates one solution step from names to ids. Every action keeps its shape; only the fields
 * that name sprouts change, so the translation is done field by field. TypeScript cannot follow a
 * field-wise rewrite over a union, hence the single cast at the end, safe by construction.
 */
export function toAction(labels: Labels, step: LevelAction): Result<Action, LabelError> {
  const translated: Record<string, unknown> = { ...step };
  for (const field of SPROUT_FIELDS) {
    const name = (step as Record<string, unknown>)[field];
    if (typeof name !== 'string') continue;
    const vertex = named(labels, name);
    if (!vertex.ok) return vertex;
    translated[field] = vertex.value;
  }
  for (const field of PATH_FIELDS) {
    const names = (step as Record<string, unknown>)[field];
    if (!Array.isArray(names)) continue;
    const vertices = toSprouts(labels, names as string[]);
    if (!vertices.ok) return vertices;
    translated[field] = vertices.value;
  }
  return ok(translated as Action);
}

/** Translates a list of moves, stopping at the first unknown name. */
export function toActions(
  labels: Labels,
  steps: readonly LevelAction[],
): Result<Action[], LabelError> {
  const actions: Action[] = [];
  for (const step of steps) {
    const action = toAction(labels, step);
    if (!action.ok) return action;
    actions.push(action.value);
  }
  return ok(actions);
}

/**
 * Translates one step of a script: the sprout a `count` of lanterns asks about, the moves of a
 * demo and the vine of a bet on where the light will stop.
 */
export function toLevelStep(labels: Labels, step: FlowStep): Result<LevelStep, LabelError> {
  switch (step.step) {
    case 'count': {
      // Only a count of lanterns on a piece names a sprout.
      if (step.of === 'loop' || step.of === 'winningThreads') return ok(step);
      const piece = named(labels, step.piece);
      return piece.ok ? ok({ ...step, piece: piece.value }) : piece;
    }
    case 'replay': {
      if (step.demo === undefined) return ok({ step: 'replay' });
      const demo = toActions(labels, step.demo);
      return demo.ok ? ok({ step: 'replay', demo: demo.value }) : demo;
    }
    case 'pickVine': {
      // Only a bet names a vine: where the light will stop.
      const { stop, ...rest } = step;
      if (stop === undefined) return ok(rest);
      const vine = toEdges(labels, [stop]);
      return vine.ok ? ok({ ...rest, stop: itemAt(vine.value, 0) }) : vine;
    }
    default:
      return ok(step);
  }
}

/**
 * Translates one script input of a walkthrough: the sprout touched, the vine pointed at, the
 * reflection or the chain drawn, the move tried for the rules to refuse.
 */
function toFlowInput(labels: Labels, input: LevelFlowInput): Result<FlowInput, LabelError> {
  switch (input.type) {
    case 'tapSprout': {
      const vertex = named(labels, input.vertex);
      return vertex.ok ? ok({ type: 'tapSprout', vertex: vertex.value }) : vertex;
    }
    case 'pickVine': {
      const u = named(labels, input.u);
      if (!u.ok) return u;
      const v = named(labels, input.v);
      return v.ok ? ok({ type: 'pickVine', u: u.value, v: v.value }) : v;
    }
    case 'drawChain': {
      const path = toSprouts(labels, input.path);
      return path.ok ? ok({ type: 'drawChain', path: path.value }) : path;
    }
    case 'drawMirror': {
      const lanterns = toEdges(labels, input.lanterns);
      return lanterns.ok ? ok({ type: 'drawMirror', lanterns: lanterns.value }) : lanterns;
    }
    case 'refusedMove': {
      const move = toAction(labels, input.move);
      return move.ok ? ok({ type: 'refusedMove', move: move.value }) : move;
    }
    default:
      return ok(input);
  }
}

/** Translates one entry of a walkthrough, a garden move or a script input. */
export function toWalkthroughEntry(
  labels: Labels,
  entry: LevelAction | LevelFlowInput,
): Result<Action | FlowInput, LabelError> {
  return isFlowInput(entry) ? toFlowInput(labels, entry) : toAction(labels, entry);
}
