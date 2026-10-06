import type { VertexId } from '../graph/types';
import { invariant } from '../shared/invariant';
import { NO_VERTEX, type AlternatingForest } from './forest';

/**
 * The sprouts from `v` up to the root of its tree, `v` first. Parent links alternate lit and dark
 * vines, so the result is an alternating path ending in the dark root: half of a chain. Parent
 * links strictly approach the root, so the climb ends after at most n − 1 hops.
 */
export function pathToRoot(forest: AlternatingForest, v: VertexId): VertexId[] {
  invariant(
    forest.label[v] !== undefined && forest.label[v] !== 'none',
    `${v} is not in the forest`,
  );
  const path: VertexId[] = [v];
  let current = v;
  while (forest.parent[current] !== NO_VERTEX) {
    current = forest.parent[current] as VertexId;
    path.push(current);
  }
  return path;
}
