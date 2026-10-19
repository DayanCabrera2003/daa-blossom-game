import type { GardenNode } from '@core/blossom/types';
import { tutteBergeBound } from '@core/certificates/tutteBerge';
import { size } from '@core/matching/queries';
import type { GardenState } from '@core/rules/state';

/**
 * The best a play of a level has reached so far, in the signals that matter (plan 10, phase 5):
 * what tells real progress from moves that go round in circles. Only progress restarts the wait
 * for a hint (`hints.ts`).
 *
 * The search counts (`marked`, `folded`, `seen`) belong to the search of the record's lanterns:
 * lighting a lantern clears the marks, so the search of the new lanterns starts its own count.
 */
export interface ProgressRecord {
  /** The most lanterns lit. */
  readonly lanterns: number;
  /** With those lanterns, the most sprouts marked sun or moon, by hand or by the light. */
  readonly marked: number;
  /** With those lanterns, the most flowers folded at once, nested ones included. */
  readonly folded: number;
  /** With those lanterns, whether the marks have reached a chain. */
  readonly seen: boolean;
  /** The most sprouts the fog no longer hides. */
  readonly inspected: number;
  /** The most vines the scarecrows guard. */
  readonly guarded: number;
  /**
   * Where stones can be lifted (chapter 7), the fewest sprouts in the dark beyond the Council's
   * "at least" (0 when the count proves the garden can do no better); 0 elsewhere.
   */
  readonly gap: number;
}

/** The flowers in a node, itself included, nested ones too. */
const flowersIn = (node: GardenNode): number =>
  node.kind === 'sprout' ? 0 : 1 + node.cycle.reduce((sum, child) => sum + flowersIn(child), 0);

/** The sprouts in the dark beyond the Council's "at least", where stones can be lifted. */
function councilGap(state: GardenState): number {
  if (!state.allowed.has('liftStone')) return 0;
  const { graph, stones, matching } = state;
  const atLeast = Math.max(0, graph.n - 2 * tutteBergeBound(graph, stones));
  return graph.n - 2 * size(matching) - atLeast;
}

/** What one garden reaches, as a record of its own. */
export function measure(state: GardenState): ProgressRecord {
  const { graph, layer, search, revealed, scarecrows } = state;
  // A sprout is marked when the folded node holding it is: a flower's petals share its sun.
  let marked = 0;
  if (search !== null) {
    for (let v = 0; v < graph.n; v++) {
      const node = layer.nodeOf[v];
      if (node !== undefined && search.label[node] !== 'none') marked++;
    }
  }
  const guards = new Set(scarecrows);
  return {
    lanterns: size(state.matching),
    marked,
    folded: layer.nodes.reduce((sum, node) => sum + flowersIn(node), 0),
    seen: state.chainSeen !== null,
    inspected: revealed?.filter(Boolean).length ?? 0,
    guarded: graph.edges.filter(([u, v]) => guards.has(u) || guards.has(v)).length,
    gap: councilGap(state),
  };
}

/**
 * Whether `state` beats `record` in some signal: more lanterns; with the same lanterns, more marks,
 * more flowers folded or the chain seen; more sprouts inspected; more vines guarded; a smaller gap
 * to the Council's count. Equalling the record is no progress, so joining and splitting in a loop,
 * or marking again what was undone, beat nothing.
 */
export function surpasses(record: ProgressRecord, state: GardenState): boolean {
  const now = measure(state);
  if (now.lanterns > record.lanterns) return true;
  if (now.inspected > record.inspected || now.guarded > record.guarded || now.gap < record.gap) {
    return true;
  }
  if (now.lanterns < record.lanterns) return false;
  return now.marked > record.marked || now.folded > record.folded || (now.seen && !record.seen);
}

/**
 * The record once `state` is reached: each signal at its best. More lanterns start the count of a
 * new search; fewer leave the search counts of the record's lanterns as they were.
 */
export function raiseRecord(record: ProgressRecord, state: GardenState): ProgressRecord {
  const now = measure(state);
  const global = {
    inspected: Math.max(record.inspected, now.inspected),
    guarded: Math.max(record.guarded, now.guarded),
    gap: Math.min(record.gap, now.gap),
  };
  if (now.lanterns > record.lanterns) return { ...now, ...global };
  if (now.lanterns < record.lanterns) return { ...record, ...global };
  return {
    lanterns: record.lanterns,
    marked: Math.max(record.marked, now.marked),
    folded: Math.max(record.folded, now.folded),
    seen: record.seen || now.seen,
    ...global,
  };
}
