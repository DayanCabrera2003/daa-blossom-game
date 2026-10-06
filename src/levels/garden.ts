import { createGraph, type GraphError } from '@core/graph/createGraph';
import { createLabels, toEdges, type LabelError, type Labels } from '@core/graph/labels';
import type { Graph } from '@core/graph/types';
import { createMatching, type MatchingError } from '@core/matching/createMatching';
import type { Matching } from '@core/matching/types';
import { err, ok, type Result } from '@core/shared/result';

/** A garden as a file writes it: sprout names in id order, vines and lit lanterns by name. */
export interface WrittenGarden {
  readonly names: readonly string[];
  readonly vines: readonly (readonly [string, string])[];
  readonly lanterns: readonly (readonly [string, string])[];
}

/** A garden built with the core: the names of its sprouts, its vines and its lanterns. */
export interface BuiltGarden {
  readonly labels: Labels;
  readonly graph: Graph;
  readonly matching: Matching;
}

/** Why a written garden is not a garden: a name, the vines, or the lanterns. */
export type GardenError =
  | { readonly code: 'badLabel'; readonly error: LabelError }
  | { readonly code: 'badGraph'; readonly error: GraphError }
  | { readonly code: 'badLanterns'; readonly error: MatchingError };

/**
 * Builds a garden written with names: distinct names, vines between named sprouts (no loops, no
 * repeats), and lanterns that are a valid set of lit vines. Shared by levels and their notebook's
 * counterexamples, so both are held to the same rules.
 */
export function buildGarden(written: WrittenGarden): Result<BuiltGarden, GardenError> {
  const labels = createLabels(written.names);
  if (!labels.ok) return err({ code: 'badLabel', error: labels.error });

  const vines = toEdges(labels.value, written.vines);
  if (!vines.ok) return err({ code: 'badLabel', error: vines.error });
  const graph = createGraph(written.names.length, vines.value);
  if (!graph.ok) return err({ code: 'badGraph', error: graph.error });

  const lit = toEdges(labels.value, written.lanterns);
  if (!lit.ok) return err({ code: 'badLabel', error: lit.error });
  const matching = createMatching(graph.value, lit.value);
  if (!matching.ok) return err({ code: 'badLanterns', error: matching.error });

  return ok({ labels: labels.value, graph: graph.value, matching: matching.value });
}
