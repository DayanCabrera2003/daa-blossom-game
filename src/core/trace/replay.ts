import type { VertexId } from '../graph/types';
import { flipAlong } from '../matching/augment';
import type { Matching } from '../matching/types';
import type { ForestLabel } from '../search/forest';
import { invariant } from '../shared/invariant';
import type { NodeRef, TraceEvent } from './events';

/** A folded flower as the view shows it; `parent` is the flower it is folded into, if any. */
export interface FlowerSnapshot {
  readonly id: number;
  readonly base: VertexId;
  readonly members: readonly VertexId[];
  readonly parent: number | null;
}

/** The garden at one moment of a run: lanterns, marks on every sprout, and folded flowers. */
export interface GardenSnapshot {
  readonly mate: readonly (VertexId | -1)[];
  readonly label: readonly ForestLabel[];
  /** Ordered by id, i.e. by the order in which they were folded. */
  readonly flowers: readonly FlowerSnapshot[];
}

/**
 * The garden after the first `k` events of a trace that started from `initial` (the sun slider:
 * k = 0 is dawn, k = trace.length is dusk). Replaying from the start keeps it trivially in sync
 * with the run; the view never computes anything itself, it only shows snapshots.
 *
 * - `searchStart` wipes marks and flowers: each search starts from the open garden;
 * - `labelOuter` / `labelInner` mark one sprout;
 * - `contract` folds: its members all shine as suns, and the flowers it swallows record it;
 * - `expand` opens a flower: those directly inside it come back to the top;
 * - `augment` passes the lanterns along its chain;
 * - the rest (scans, conflicts, endings) change nothing the garden shows.
 */
export function stateAt(
  initial: Matching,
  trace: readonly TraceEvent[],
  k: number,
): GardenSnapshot {
  invariant(Number.isInteger(k) && k >= 0 && k <= trace.length, `no moment ${k} in this trace`);
  let matching = initial;
  let label = new Array<ForestLabel>(initial.mate.length).fill('none');
  let flowers = new Map<number, FlowerSnapshot>();

  const sproutsOf = (ref: NodeRef): VertexId[] => {
    if (ref.kind === 'sprout') return [ref.vertex];
    const inner = flowers.get(ref.id);
    invariant(inner !== undefined, `flower ${ref.id} is folded before it exists`);
    return [...inner.members];
  };

  for (const event of trace.slice(0, k)) {
    switch (event.type) {
      case 'searchStart':
        label = label.map(() => 'none');
        flowers = new Map();
        break;
      case 'labelOuter':
      case 'labelInner':
        label[event.vertex] = event.type === 'labelOuter' ? 'outer' : 'inner';
        break;
      case 'contract': {
        const inside = event.cycle.flatMap(sproutsOf).sort((a, b) => a - b);
        for (const v of inside) label[v] = 'outer';
        for (const ref of event.cycle) {
          const child = ref.kind === 'blossom' ? flowers.get(ref.id) : undefined;
          if (child) flowers.set(child.id, { ...child, parent: event.blossom });
        }
        flowers.set(event.blossom, {
          id: event.blossom,
          base: event.base,
          members: inside,
          parent: null,
        });
        break;
      }
      case 'expand':
        flowers.delete(event.blossom);
        for (const flower of flowers.values()) {
          if (flower.parent === event.blossom) flowers.set(flower.id, { ...flower, parent: null });
        }
        break;
      case 'augment':
        matching = flipAlong(matching, event.path);
        break;
      default:
        break;
    }
  }

  return {
    mate: matching.mate,
    label,
    flowers: [...flowers.values()].sort((a, b) => a.id - b.id),
  };
}
