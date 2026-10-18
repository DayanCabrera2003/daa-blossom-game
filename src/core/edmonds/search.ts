import { contract, openLayer } from '../blossom/contract';
import { findOddCycle } from '../blossom/detect';
import type { GardenNode, Layer } from '../blossom/types';
import { vinesFrom } from '../blossom/vineBetween';
import { neighbors } from '../graph/queries';
import type { Graph, VertexId } from '../graph/types';
import { exposedVertices } from '../matching/queries';
import type { Matching } from '../matching/types';
import { invariant } from '../shared/invariant';
import { itemAt } from '../shared/itemAt';
import { plantGrowingForest, type AlternatingForest } from '../search/forest';
import { chainThrough, growInto, readVine } from '../search/growForest';
import { contractEvent } from '../trace/contractEvent';
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
 *
 * An ordinary examination costs O(1) amortised, as in Proposition 11.2(2) of the Códex: the forest
 * is local state of this run and grows in place, the climbs to a root are built only for a chain
 * or a flower, the original vines leaving a sun are named once when it leaves the queue, and the
 * base sprout of each node is found once and remembered.
 */
export function searchWithFlowers(
  graph: Graph,
  matching: Matching,
  recorder: TraceRecorder = createRecorder(),
): FlowerSearchOutcome {
  let layer = openLayer(graph, matching);
  const roots = exposedVertices(matching);
  let forest = plantGrowingForest(matching, roots);
  recorder.record({ type: 'searchStart', roots });
  for (const root of roots)
    recorder.record({ type: 'labelOuter', vertex: root, parent: null, root });

  // The base sprout of a node, remembered: a new flower's is its base child's, already known.
  const bases = new WeakMap<GardenNode, VertexId>();
  const baseOf = (node: GardenNode): VertexId => {
    if (node.kind === 'sprout') return node.vertex;
    const known = bases.get(node);
    if (known !== undefined) return known;
    const base = baseOf(itemAt(node.cycle, 0));
    bases.set(node, base);
    return base;
  };
  const sproutOf = (id: VertexId): VertexId => baseOf(itemAt(layer.nodes, id));
  let queue: VertexId[] = [...roots];
  let head = 0;
  while (head < queue.length) {
    const u = itemAt(queue, head++);
    const vines = vinesFrom(layer, u);
    for (const x of neighbors(layer.graph, u)) {
      const vine = vines.get(x);
      invariant(vine !== undefined, `no vine joins nodes ${u} and ${x}`);
      recorder.record({ type: 'scanEdge', from: vine[0], to: vine[1] });
      const step = readVine(layer.matching, forest, u, x);

      if (step.kind === 'grow') {
        growInto(forest, u, step.inner, step.outer);
        const root = sproutOf(itemAt(forest.root, u));
        const moon = sproutOf(step.inner);
        recorder.record({ type: 'labelInner', vertex: moon, parent: vine[0], root });
        recorder.record({ type: 'labelOuter', vertex: sproutOf(step.outer), parent: moon, root });
        queue.push(step.outer);
      } else if (step.kind === 'chain') {
        return { kind: 'augmentingPath', layer, path: chainThrough(forest, u, x) };
      } else if (step.kind === 'oddCycle') {
        recorder.record({ type: 'oddCycleFound', vine });
        const before = layer;
        const folded = contract(before, findOddCycle(forest, u, x));
        layer = folded.layer;
        const flower = layer.nodes[folded.blossom];
        invariant(flower?.kind === 'blossom', 'a fold must produce a flower');
        recorder.record(contractEvent(flower));
        forest = foldForest(forest, before, layer, folded.blossom);
        // Pending suns are renamed; those swallowed by the flower are replaced by the flower.
        const rename = (id: VertexId): VertexId =>
          itemAt(layer.nodeOf, baseOf(itemAt(before.nodes, id)));
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
