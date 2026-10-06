import { createOperationCounter, type OperationCounter } from '../../cost/operationCounter';
import { neighbors } from '../../graph/queries';
import type { Graph, VertexId } from '../../graph/types';
import { emptyMatching } from '../../matching/createMatching';
import { UNMATCHED, type Matching } from '../../matching/types';

const NONE = -1;

/**
 * Edmonds' algorithm in its classic compact form, O(n³) (Códex C11). Instead of building folded
 * gardens it keeps `base[v]`, the base of the outermost flower holding v, so a fold is one O(n)
 * pass that rebases its sprouts. It records no trace, only a count of its work: it is the engine
 * of the races (chapter 6), the source of the cost chart, and a second oracle, independent of the
 * didactic version, for gardens too large for Bruto.
 *
 * One search per sprout in the dark, grown from that single root. If no chain leaves a root now,
 * none ever will (augmenting elsewhere never creates one), so each root is searched once:
 * n searches of O(m) scans plus at most n folds of O(n) each, hence O(n·m + n³) = O(n³).
 */
export function fastEdmonds(
  graph: Graph,
  initial: Matching = emptyMatching(graph),
  counter: OperationCounter = createOperationCounter(),
): Matching {
  const n = graph.n;
  const mate = [...initial.mate];
  // parent[v]: for a moon, the sun it was reached from (alternating tree links).
  const parent = new Array<VertexId>(n).fill(NONE);
  const base = new Array<VertexId>(n).fill(NONE);
  // inTree[v]: v is a sun (or folded into one) of the current tree, and has been queued.
  const inTree = new Array<boolean>(n).fill(false);
  const inFlower = new Array<boolean>(n).fill(false);
  let queue: VertexId[] = [];

  /** Lowest common ancestor of suns `a` and `b` in the tree, read through flower bases. */
  const lowestCommonAncestor = (a: VertexId, b: VertexId): VertexId => {
    const seen = new Array<boolean>(n).fill(false);
    for (let v = a; ;) {
      v = base[v] as VertexId;
      seen[v] = true;
      if (mate[v] === UNMATCHED) break;
      v = parent[mate[v] as VertexId] as VertexId;
    }
    for (let v = b; ;) {
      v = base[v] as VertexId;
      if (seen[v]) return v;
      v = parent[mate[v] as VertexId] as VertexId;
    }
  };

  /** Marks the flowers between `v` and the new base, pointing moons on the way back to `child`. */
  const markPath = (start: VertexId, flowerBase: VertexId, startChild: VertexId): void => {
    let v = start;
    let child = startChild;
    while (base[v] !== flowerBase) {
      const partner = mate[v] as VertexId;
      inFlower[base[v] as VertexId] = true;
      inFlower[base[partner] as VertexId] = true;
      // The moon on this side can now also be left towards `child`: the other way round the loop.
      parent[v] = child;
      child = partner;
      v = parent[partner] as VertexId;
    }
  };

  /** Grows a tree from `root`; returns the dark sprout a chain reaches, or NONE. */
  const findChain = (root: VertexId): VertexId => {
    inTree.fill(false);
    parent.fill(NONE);
    for (let v = 0; v < n; v++) base[v] = v;
    inTree[root] = true;
    counter.count('label');
    queue = [root];

    for (let head = 0; head < queue.length; head++) {
      const v = queue[head] as VertexId;
      for (const to of neighbors(graph, v)) {
        counter.count('scan');
        if (base[v] === base[to] || mate[v] === to) continue;
        const toIsSun =
          to === root || (mate[to] !== UNMATCHED && parent[mate[to] as VertexId] !== NONE);
        if (toIsSun) {
          // Two suns of this tree: fold every flower on the loop into one with the common base.
          const flowerBase = lowestCommonAncestor(v, to);
          inFlower.fill(false);
          markPath(v, flowerBase, to);
          markPath(to, flowerBase, v);
          for (let i = 0; i < n; i++) {
            if (!inFlower[base[i] as VertexId]) continue;
            base[i] = flowerBase;
            counter.count('rebase');
            if (!inTree[i]) {
              // A moon folded into the flower becomes part of a sun: its vines must be scanned.
              inTree[i] = true;
              counter.count('label');
              queue.push(i);
            }
          }
        } else if (parent[to] === NONE) {
          parent[to] = v;
          counter.count('label');
          if (mate[to] === UNMATCHED) return to;
          const partner = mate[to] as VertexId;
          inTree[partner] = true;
          counter.count('label');
          queue.push(partner);
        }
      }
    }
    return NONE;
  };

  for (let root = 0; root < n; root++) {
    if (mate[root] !== UNMATCHED) continue;
    // Pass the lanterns back from the dark end of the chain to the root.
    for (let v = findChain(root); v !== NONE;) {
      const previous = parent[v] as VertexId;
      const next = mate[previous] as VertexId;
      mate[v] = previous;
      mate[previous] = v;
      counter.count('flip');
      v = next;
    }
  }
  return { mate };
}
