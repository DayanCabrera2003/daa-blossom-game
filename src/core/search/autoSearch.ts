import { members } from '../blossom/hierarchy';
import type { Layer } from '../blossom/types';
import { neighbors } from '../graph/queries';
import type { VertexId } from '../graph/types';
import { isExposed, isMatchedEdge } from '../matching/queries';
import type { Action } from '../rules/actions';
import { itemAt } from '../shared/itemAt';
import { plantForest, type AlternatingForest } from './forest';
import { growStep } from './growForest';

/** The moves the light makes: a sun on a sprout in the dark, or a look along a dark vine. */
type LightMove = Extract<Action, { readonly type: 'markRoot' | 'markMoon' }>;

/**
 * The dark vines a sun (the node `sun` of the layer) may look along, as original vines
 * `[from, to]`: from each of its sprouts to a neighbor outside it, never along its own lantern.
 * Ordered by the sprout looked at, then by the sprout looked from, so the order is fixed.
 */
function looksFrom(layer: Layer, sun: VertexId): (readonly [VertexId, VertexId])[] {
  const looks: (readonly [VertexId, VertexId])[] = [];
  for (const from of members(itemAt(layer.nodes, sun))) {
    for (const to of neighbors(layer.original, from)) {
      const node = itemAt(layer.nodeOf, to);
      if (node !== sun && !isMatchedEdge(layer.matching, sun, node)) looks.push([from, to]);
    }
  }
  return looks.sort(([fromA, toA], [fromB, toB]) => toA - toB || fromA - fromB);
}

/** The forest with the node `node` (in the dark, unmarked) made the sun of a tree of its own. */
const withRoot = (forest: AlternatingForest, node: VertexId): AlternatingForest => ({
  label: forest.label.map((mark, id) => (id === node ? 'outer' : mark)),
  parent: forest.parent,
  root: forest.root.map((root, id) => (id === node ? node : root)),
});

/**
 * The search the light makes by itself (4.1, 4.2): the player's own moves (`markRoot`,
 * `markMoon`) with the rules of the greenhouse (`growStep`, the same `markMoon` applies), in one
 * fixed order, so it always goes the same way in the same garden.
 *
 * The order: the suns already marked in `forest` (on the ids of `layer`; null before the first
 * mark) are searched first, in ascending order; then each sprout allowed to start a search
 * (`roots`, in their order, or every sprout in ascending order when null) that is in the dark and
 * unmarked gets a sun, and its tree is searched breadth first. A sun looks along its dark vines to
 * the sprouts in ascending order (`looksFrom`): an unmarked sprout with a lantern becomes a moon and
 * its partner a sun, which waits its turn; a moon is already marked and left (3.3); a sun of the
 * same tree is left as well, "already marked", because the light never folds (4.1: this is how it
 * lies). The light stops at the first look that finds a chain, which the rules accept and show, or
 * when nothing is left to look at.
 *
 * Every move is one `applyAction` accepts, in order, on a garden whose level allows marking, has
 * no fog over the sprouts looked from, and starts its searches from `roots`.
 */
export function autoSearch(
  layer: Layer,
  forest: AlternatingForest | null,
  roots: readonly VertexId[] | null,
): LightMove[] {
  const moves: LightMove[] = [];
  let marks = forest ?? plantForest(layer.matching, []);
  const queue: VertexId[] = marks.label.flatMap((mark, node) => (mark === 'outer' ? [node] : []));

  /** Searches the suns waiting in the queue; true when a look found a chain. */
  const searchQueue = (): boolean => {
    for (let next = 0; next < queue.length; next++) {
      const sun = itemAt(queue, next);
      for (const [from, to] of looksFrom(layer, sun)) {
        const step = growStep(layer.matching, marks, sun, itemAt(layer.nodeOf, to));
        if (step.kind === 'chain') {
          moves.push({ type: 'markMoon', from, to });
          return true;
        }
        if (step.kind === 'grow') {
          moves.push({ type: 'markMoon', from, to });
          marks = step.forest;
          queue.push(step.outer);
        }
      }
    }
    queue.length = 0;
    return false;
  };

  if (searchQueue()) return moves;
  const starts = roots ?? layer.nodeOf.map((_, sprout) => sprout);
  for (const root of starts) {
    const node = itemAt(layer.nodeOf, root);
    if (marks.label[node] !== 'none' || !isExposed(layer.matching, node)) continue;
    moves.push({ type: 'markRoot', vertex: root });
    marks = withRoot(marks, node);
    queue.push(node);
    if (searchQueue()) return moves;
  }
  return moves;
}
