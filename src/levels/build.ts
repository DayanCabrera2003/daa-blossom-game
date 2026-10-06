import { createGraph, type GraphError } from '@core/graph/createGraph';
import { createLabels, idOf, toEdges, type LabelError, type Labels } from '@core/graph/labels';
import type { Graph, VertexId } from '@core/graph/types';
import { createMatching, type MatchingError } from '@core/matching/createMatching';
import type { Action } from '@core/rules/actions';
import { actionsUnlockedBy } from '@core/rules/permissions';
import { createGardenState, type GardenState } from '@core/rules/state';
import { err, ok, type Result } from '@core/shared/result';
import type { LevelAction } from './fields';
import type { LevelData } from './schema';

/** A level ready to play: its data, and the core objects built from it. */
export interface Level {
  readonly data: LevelData;
  readonly labels: Labels;
  readonly graph: Graph;
  /** The garden as the level starts: lanterns, fog and unlocked actions in place. */
  readonly start: GardenState;
  /** The reference solution, with sprout ids. */
  readonly solution: readonly Action[];
  /** The hints, each with the ids of the sprouts it lights up. */
  readonly hints: readonly LevelHint[];
}

/** A hint of the level: the line the mentor says and the sprouts that glow with it. */
export interface LevelHint {
  readonly line: string;
  readonly highlight: readonly VertexId[];
}

/** Why a schema-valid level file still does not describe a playable garden. */
export type BuildError =
  | { readonly code: 'badLabel'; readonly error: LabelError }
  | { readonly code: 'badGraph'; readonly error: GraphError }
  | { readonly code: 'badLanterns'; readonly error: MatchingError };

const SPROUT_FIELDS = ['u', 'v', 'from', 'to', 'vertex'] as const;
const PATH_FIELDS = ['path', 'stem', 'loop'] as const;

/**
 * Translates one solution step from names to ids. Every action keeps its shape; only the fields
 * that name sprouts change, so the translation is done field by field. TypeScript cannot follow a
 * field-wise rewrite over a union, hence the single cast at the end, safe by construction.
 */
function toAction(labels: Labels, step: LevelAction): Result<Action, LabelError> {
  const translated: Record<string, unknown> = { ...step };
  const id = (name: string): VertexId | LabelError =>
    idOf(labels, name) ?? { code: 'unknownName', name };
  for (const field of SPROUT_FIELDS) {
    const name = (step as Record<string, unknown>)[field];
    if (typeof name !== 'string') continue;
    const vertex = id(name);
    if (typeof vertex !== 'number') return err(vertex);
    translated[field] = vertex;
  }
  for (const field of PATH_FIELDS) {
    const names = (step as Record<string, unknown>)[field];
    if (!Array.isArray(names)) continue;
    const vertices: VertexId[] = [];
    for (const name of names as string[]) {
      const vertex = id(name);
      if (typeof vertex !== 'number') return err(vertex);
      vertices.push(vertex);
    }
    translated[field] = vertices;
  }
  return ok(translated as Action);
}

/**
 * Builds the playable level from its validated file: labels, garden, starting lanterns, the
 * actions it allows (those unlocked by its id, minus `forbid`) and its solution with ids.
 */
export function buildLevel(data: LevelData): Result<Level, BuildError> {
  const labels = createLabels(data.sprouts.map((sprout) => sprout.label));
  if (!labels.ok) return err({ code: 'badLabel', error: labels.error });

  const vines = toEdges(labels.value, data.vines);
  if (!vines.ok) return err({ code: 'badLabel', error: vines.error });
  const graph = createGraph(data.sprouts.length, vines.value);
  if (!graph.ok) return err({ code: 'badGraph', error: graph.error });

  const lit = toEdges(labels.value, data.lanterns);
  if (!lit.ok) return err({ code: 'badLabel', error: lit.error });
  const matching = createMatching(graph.value, lit.value);
  if (!matching.ok) return err({ code: 'badLanterns', error: matching.error });

  const hints: LevelHint[] = [];
  for (const hint of data.hints) {
    const highlight: VertexId[] = [];
    for (const name of hint.highlight) {
      const vertex = idOf(labels.value, name);
      if (vertex === undefined)
        return err({ code: 'badLabel', error: { code: 'unknownName', name } });
      highlight.push(vertex);
    }
    hints.push({ line: hint.line, highlight });
  }

  const solution: Action[] = [];
  for (const step of data.solution) {
    const action = toAction(labels.value, step);
    if (!action.ok) return err({ code: 'badLabel', error: action.error });
    solution.push(action.value);
  }

  const forbidden = new Set(data.forbid);
  const start = createGardenState({
    graph: graph.value,
    matching: matching.value,
    fog: data.fog,
    allowed: actionsUnlockedBy(data.id).filter((action) => !forbidden.has(action)),
  });
  return ok({ data, labels: labels.value, graph: graph.value, start, solution, hints });
}
