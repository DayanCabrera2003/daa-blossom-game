import { contract, openLayer } from '../blossom/contract';
import { findOddCycle } from '../blossom/detect';
import { baseVertex } from '../blossom/hierarchy';
import type { GardenNode, Layer } from '../blossom/types';
import { vineBetween } from '../blossom/vineBetween';
import { neighbors } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { exposedVertices } from '../matching/queries';
import type { Matching } from '../matching/types';
import { plantForest, type AlternatingForest } from '../search/forest';
import { growStep } from '../search/growForest';
import type { NodeRef } from '../trace/events';
import { createRecorder, type TraceRecorder } from '../trace/recorder';
import { foldForest } from './foldForest';

/**
 * How a search with flowers ended. A chain is given in the ids of the folded garden it was found
 * in (unfold it with `expandPath`); a failed search keeps its final garden and forest, which hold
 * the certificate of optimality (the moons are the stones, Códex C12).
 */
export type FlowerSearchOutcome =
  | { readonly kind: 'augmentingPath'; readonly layer: Layer; readonly path: readonly VertexId[] }
  | { readonly kind: 'noPath'; readonly layer: Layer; readonly forest: AlternatingForest };

/** A folded node named stably, for the trace. */
const refOf = (node: GardenNode): NodeRef =>
  node.kind === 'sprout'
    ? { kind: 'sprout', vertex: node.vertex }
    : { kind: 'blossom', id: node.id };

/**
 * One search of Edmonds' algorithm (Códex C10): the bipartite search of chapter 3 plus the fold of
 * chapter 4. Suns are scanned breadth-first; each vine follows the growth rules, except that two
 * suns of the same tree no longer stop the search: their loop is folded into a flower, the forest
 * is carried over (`foldForest`) and the flower is queued as a new sun, since its petals' vines now
 * leave a sun. The search then goes on in the folded garden, which by the flower lemma (C8) has a
 * chain exactly when the original does.
 *
 * Each sprout is marked once: folding never unmarks anyone, it only merges marked nodes. Each fold
 * removes at least two nodes, so a search folds fewer than n/2 times and always terminates.
 */
export function searchWithFlowers(
  graph: Graph,
  matching: Matching,
  recorder: TraceRecorder = createRecorder(),
): FlowerSearchOutcome {
  let layer = openLayer(graph, matching);
  const roots = exposedVertices(matching);
  let forest = plantForest(matching, roots);
  recorder.record({ type: 'searchStart', roots });
  for (const root of roots)
    recorder.record({ type: 'labelOuter', vertex: root, parent: null, root });

  const sproutOf = (id: VertexId): VertexId => baseVertex(layer.nodes[id] as GardenNode);
  let queue: VertexId[] = [...roots];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++] as VertexId;
    for (const x of neighbors(layer.graph, u)) {
      const vine = vineBetween(layer, u, x);
      recorder.record({ type: 'scanEdge', from: vine[0], to: vine[1] });
      const step = growStep(layer.matching, forest, u, x);

      if (step.kind === 'grow') {
        forest = step.forest;
        const root = sproutOf(forest.root[u] as VertexId);
        const moon = sproutOf(step.inner);
        recorder.record({ type: 'labelInner', vertex: moon, parent: vine[0], root });
        recorder.record({ type: 'labelOuter', vertex: sproutOf(step.outer), parent: moon, root });
        queue.push(step.outer);
      } else if (step.kind === 'chain') {
        return { kind: 'augmentingPath', layer, path: step.path };
      } else if (step.kind === 'oddCycle') {
        recorder.record({ type: 'oddCycleFound', vine });
        const before = layer;
        const folded = contract(before, findOddCycle(forest, u, x));
        layer = folded.layer;
        const flower = layer.nodes[folded.blossom] as GardenNode;
        if (flower.kind === 'blossom') {
          recorder.record({
            type: 'contract',
            blossom: flower.id,
            base: baseVertex(flower),
            cycle: flower.cycle.map(refOf),
          });
        }
        forest = foldForest(forest, before, layer, folded.blossom);
        // Pending suns are renamed; those swallowed by the flower are replaced by the flower.
        const rename = (id: VertexId): VertexId =>
          layer.nodeOf[baseVertex(before.nodes[id] as GardenNode)] as VertexId;
        const pending = queue.slice(head).map(rename);
        queue = [...new Set(pending.filter((id) => id !== folded.blossom)), folded.blossom];
        head = 0;
        // `u` is inside the flower now: its remaining vines are scanned from the flower.
        break;
      }
    }
  }

  recorder.record({ type: 'searchFailed' });
  return { kind: 'noPath', layer, forest };
}
