import { idOf, toEdges, type Labels } from '@core/graph/labels';
import type { Graph, VertexId } from '@core/graph/types';
import { createMatching, type MatchingError } from '@core/matching/createMatching';
import type { Matching } from '@core/matching/types';
import type { Action } from '@core/rules/actions';
import { actionsUnlockedBy } from '@core/rules/permissions';
import { createGardenState, type GardenState } from '@core/rules/state';
import { err, ok, type Result } from '@core/shared/result';
import type { LevelData } from './schema';
import type { LevelStep } from './flow';
import { isFlowInput, type FlowInput } from './flowInput';
import { buildGarden, type GardenError } from './garden';
import { toLevelStep, toWalkthroughEntry } from './translate';

/** One entry of a walkthrough: a garden move, or an input the script asks for. */
export type WalkthroughEntry = Action | FlowInput;

/** A level ready to play: its data, and the core objects built from it. */
export interface Level {
  readonly data: LevelData;
  readonly labels: Labels;
  readonly graph: Graph;
  /** The garden as the level starts: lanterns, fog and unlocked actions in place. */
  readonly start: GardenState;
  /** The lanterns of the reflection in the pond (chapter 2); null when the level has none. */
  readonly mirror: Matching | null;
  /** What happens in the level, in order, with sprout ids. */
  readonly flow: readonly LevelStep[];
  /** The moves of the reference walkthrough, with sprout ids. */
  readonly solution: readonly Action[];
  /** The whole reference walkthrough in order, moves and script inputs, with sprout ids. */
  readonly walkthrough: readonly WalkthroughEntry[];
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
  GardenError | { readonly code: 'badMirror'; readonly error: MatchingError };

/**
 * Builds the playable level from its validated file: labels, garden, starting lanterns, the
 * reflection (a valid set of lanterns of the same garden), the actions it allows (those unlocked by
 * its id, minus `forbid`) and its solution with ids.
 */
export function buildLevel(data: LevelData): Result<Level, BuildError> {
  const built = buildGarden({
    names: data.sprouts.map((sprout) => sprout.label),
    vines: data.vines,
    lanterns: data.lanterns,
  });
  if (!built.ok) return built;
  const { labels, graph, matching } = built.value;

  let mirror: Matching | null = null;
  if (data.mirror !== undefined) {
    const reflected = toEdges(labels, data.mirror);
    if (!reflected.ok) return err({ code: 'badLabel', error: reflected.error });
    const reflection = createMatching(graph, reflected.value);
    if (!reflection.ok) return err({ code: 'badMirror', error: reflection.error });
    mirror = reflection.value;
  }

  const hints: LevelHint[] = [];
  for (const hint of data.hints) {
    const highlight: VertexId[] = [];
    for (const name of hint.highlight) {
      const vertex = idOf(labels, name);
      if (vertex === undefined)
        return err({ code: 'badLabel', error: { code: 'unknownName', name } });
      highlight.push(vertex);
    }
    hints.push({ line: hint.line, highlight });
  }

  const flow: LevelStep[] = [];
  for (const step of data.flow) {
    const built = toLevelStep(labels, step);
    if (!built.ok) return err({ code: 'badLabel', error: built.error });
    flow.push(built.value);
  }

  const walkthrough: WalkthroughEntry[] = [];
  for (const entry of data.solution) {
    const built = toWalkthroughEntry(labels, entry);
    if (!built.ok) return err({ code: 'badLabel', error: built.error });
    walkthrough.push(built.value);
  }
  const solution = walkthrough.filter((entry): entry is Action => !isFlowInput(entry));

  const forbidden = new Set(data.forbid);
  const start = createGardenState({
    graph,
    matching,
    fog: data.fog,
    allowed: actionsUnlockedBy(data.id).filter((action) => !forbidden.has(action)),
  });
  return ok({
    data,
    labels,
    graph,
    start,
    mirror,
    flow,
    solution,
    walkthrough,
    hints,
  });
}
