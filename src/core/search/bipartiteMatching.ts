import type { Graph } from '../graph/types';
import { flipAlong } from '../matching/augment';
import { emptyMatching } from '../matching/createMatching';
import { size } from '../matching/queries';
import type { Matching } from '../matching/types';
import { err, ok, type Result } from '../shared/result';
import { createRecorder, type TraceRecorder } from '../trace/recorder';
import type { AlternatingForest } from './forest';
import { bipartiteSearch, type SearchConflict } from './bipartiteSearch';

/** A finished run: the maximum matching and the forest of the last, failed search. */
export interface BipartiteRun {
  readonly matching: Matching;
  /** The final forest; it is the raw material of the König certificate (Códex C5). */
  readonly forest: AlternatingForest;
}

/**
 * Searches, passes the lanterns along the chain found, and repeats until a search fails. Each chain
 * lights one more lantern and a matching has at most n/2, so there are at most n/2 + 1 searches of
 * O(n + m) each: O(n·(n + m)) overall. When the last search fails without a conflict, Berge's lemma
 * (Códex C3) says the matching is maximum.
 */
export function bipartiteMatching(
  graph: Graph,
  initial: Matching = emptyMatching(graph),
  recorder: TraceRecorder = createRecorder(),
): Result<BipartiteRun, SearchConflict> {
  let matching = initial;
  for (;;) {
    const result = bipartiteSearch(graph, matching, recorder);
    if (!result.ok) return err(result.error);
    const outcome = result.value;
    if (outcome.kind === 'noPath') {
      recorder.record({ type: 'done', size: size(matching) });
      return ok({ matching, forest: outcome.forest });
    }
    recorder.record({ type: 'augment', path: outcome.path });
    matching = flipAlong(matching, outcome.path);
  }
}
