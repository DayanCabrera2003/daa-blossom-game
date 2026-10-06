import type { Layer } from '../blossom/types';
import type { Graph } from '../graph/types';
import { emptyMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import type { AlternatingForest } from '../search/forest';
import type { TraceEvent } from '../trace/events';
import { createRecorder } from '../trace/recorder';
import { runPhase } from './phase';

/** A finished run of the recipe: the answer, how it was reached, and what proves it. */
export interface EdmondsRun {
  readonly matching: Matching;
  /** Every event of the run, in order: the source of the sun slider and the teacher panel. */
  readonly trace: readonly TraceEvent[];
  readonly steps: number;
  /** Garden and forest of the last, failed search: their moons are the stones (Códex C12). */
  readonly finalLayer: Layer;
  readonly finalForest: AlternatingForest;
}

/**
 * Edmonds' blossom algorithm, didactic version (Códex C10): phases until a search fails. Each
 * successful phase lights one more lantern, so there are at most n/2 + 1 phases. When a search
 * fails, the folded garden has no chain, so by the flower lemma (C8) neither does the original, and
 * by Berge (C3) the matching is maximum; the final forest also hands over the stones that prove it.
 */
export function edmonds(graph: Graph, initial: Matching = emptyMatching(graph)): EdmondsRun {
  const recorder = createRecorder();
  let matching = initial;
  for (;;) {
    const outcome = runPhase(graph, matching, recorder);
    if (outcome.kind === 'augmented') {
      matching = outcome.matching;
      continue;
    }
    recorder.record({ type: 'done', size: size(matching) });
    return {
      matching,
      trace: recorder.events,
      steps: recorder.steps,
      finalLayer: outcome.layer,
      finalForest: outcome.forest,
    };
  }
}
