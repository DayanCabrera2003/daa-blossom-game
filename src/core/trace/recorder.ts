import type { TraceEvent } from './events';

/**
 * Collects the events of a run and counts its steps. Algorithms receive a recorder instead of
 * creating one, so a caller keeps the partial trace even when a run stops early (e.g. the bipartite
 * search hitting an odd cycle, which the game animates as "the betrayal" of level 4.1).
 *
 * Every event is one step: it is one unit of visible work, which keeps the step counter shown in
 * races and cost charts honest and easy to explain.
 */
export interface TraceRecorder {
  /** Appends one event (and one step). */
  record(event: TraceEvent): void;
  /** The events so far, as an immutable snapshot. */
  readonly events: readonly TraceEvent[];
  /** Steps taken so far. */
  readonly steps: number;
}

/** A fresh, empty recorder. Local mutable state owned by one run, so the run stays pure. */
export function createRecorder(): TraceRecorder {
  const events: TraceEvent[] = [];
  return {
    record(event) {
      events.push(event);
    },
    get events() {
      return [...events];
    },
    get steps() {
      return events.length;
    },
  };
}
