import { neighbors } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { exposedVertices } from '../matching/queries';
import type { Matching } from '../matching/types';
import { itemAt } from '../shared/itemAt';
import { err, ok, type Result } from '../shared/result';
import { createRecorder, type TraceRecorder } from '../trace/recorder';
import { plantForest, type AlternatingForest } from './forest';
import { growStep } from './growForest';

/** How a search without blossoms ended. Both carry the forest at that moment. */
export type SearchOutcome =
  | {
      readonly kind: 'augmentingPath';
      readonly path: readonly VertexId[];
      readonly forest: AlternatingForest;
    }
  | { readonly kind: 'noPath'; readonly forest: AlternatingForest };

/**
 * Two suns of the same tree joined by a vine: an odd cycle, which a search without blossoms cannot
 * handle. Reporting it as an error, instead of answering "no chain", is what keeps this search from
 * ever lying; folding such cycles into flowers is the subject of chapter 4 and phase 5.
 */
export interface SearchConflict {
  readonly code: 'oddCycleConflict';
  readonly from: VertexId;
  readonly to: VertexId;
  readonly forest: AlternatingForest;
}

/**
 * One search for a chain (Códex C4). Every sprout in the dark becomes a root, then suns are scanned
 * breadth-first, in ascending order, so the trace is predictable and easy to narrate. Each scan
 * applies the growth rules of `growStep`; the first chain found ends the search.
 *
 * Every sprout is marked at most once (a moon is never re-marked and a sun is only queued when it
 * is marked), so each vine is scanned at most twice and the search costs O(n + m).
 *
 * If no chain turns up and no conflict appears, the matching is maximum: with no sun–sun vines,
 * every vine at a sun leads to a moon, and the moons certify optimality (König in bees and flowers,
 * Tutte–Berge in general; phases 4 and 6).
 */
export function bipartiteSearch(
  graph: Graph,
  matching: Matching,
  recorder: TraceRecorder = createRecorder(),
): Result<SearchOutcome, SearchConflict> {
  const roots = exposedVertices(matching);
  let forest = plantForest(matching, roots);
  recorder.record({ type: 'searchStart', roots });
  for (const root of roots)
    recorder.record({ type: 'labelOuter', vertex: root, parent: null, root });

  const queue: VertexId[] = [...roots];
  for (let head = 0; head < queue.length; head++) {
    const u = itemAt(queue, head);
    for (const x of neighbors(graph, u)) {
      recorder.record({ type: 'scanEdge', from: u, to: x });
      const step = growStep(matching, forest, u, x);
      switch (step.kind) {
        case 'grow': {
          forest = step.forest;
          const root = itemAt(forest.root, u);
          recorder.record({ type: 'labelInner', vertex: step.inner, parent: u, root });
          recorder.record({ type: 'labelOuter', vertex: step.outer, parent: step.inner, root });
          queue.push(step.outer);
          break;
        }
        case 'chain':
          return ok({ kind: 'augmentingPath', path: step.path, forest });
        case 'oddCycle':
          return err({ code: 'oddCycleConflict', from: step.from, to: step.to, forest });
        case 'alreadyInner':
          break;
      }
    }
  }

  recorder.record({ type: 'searchFailed' });
  return ok({ kind: 'noPath', forest });
}
