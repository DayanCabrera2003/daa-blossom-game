import { expandPath } from '../blossom/expand';
import { members } from '../blossom/hierarchy';
import type { GardenNode, Layer } from '../blossom/types';
import type { Graph, VertexId } from '../graph/types';
import { flipAlong } from '../matching/augment';
import type { Matching } from '../matching/types';
import type { AlternatingForest } from '../search/forest';
import { createRecorder, type TraceRecorder } from '../trace/recorder';
import { searchWithFlowers } from './search';

/** How a phase ended: one more lantern, or a proof-carrying failed search. */
export type PhaseOutcome =
  | { readonly kind: 'augmented'; readonly matching: Matching }
  | { readonly kind: 'maximum'; readonly layer: Layer; readonly forest: AlternatingForest };

/**
 * Records `expand` for every flower the chain crosses, outer flowers before the ones inside them
 * (level 5.2: unfolding goes from the outside in). A flower the chain does not touch stays folded
 * until the next search starts afresh (level 4.8).
 */
function recordExpansions(
  nodes: readonly GardenNode[],
  crossed: ReadonlySet<VertexId>,
  recorder: TraceRecorder,
): void {
  for (const node of nodes) {
    if (node.kind !== 'blossom' || !members(node).some((v) => crossed.has(v))) continue;
    recorder.record({ type: 'expand', blossom: node.id });
    recordExpansions(node.cycle, crossed, recorder);
  }
}

/**
 * One phase (Códex C10): search with flowers; if a chain turns up, unfold it to the original
 * garden and pass the lanterns along it. By Berge (C3) a failed search means the matching is
 * maximum, and the failed search's final forest is kept: its moons are the stones (C12).
 */
export function runPhase(
  graph: Graph,
  matching: Matching,
  recorder: TraceRecorder = createRecorder(),
): PhaseOutcome {
  const outcome = searchWithFlowers(graph, matching, recorder);
  if (outcome.kind === 'noPath') {
    return { kind: 'maximum', layer: outcome.layer, forest: outcome.forest };
  }
  const path = expandPath(outcome.layer, outcome.path);
  const onPath = outcome.path.map((id) => outcome.layer.nodes[id] as GardenNode);
  recordExpansions(onPath, new Set(path), recorder);
  recorder.record({ type: 'augment', path });
  return { kind: 'augmented', matching: flipAlong(matching, path) };
}
